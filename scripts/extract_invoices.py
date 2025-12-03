#!/usr/bin/env python3
"""
Invoice Data Extraction Script
Uses Google Vision API for images and pdf text extraction for PDFs
Extracts: Recipient Name, Total Amount, Invoice Number, Invoice Date
"""

import os
import re
import json
import base64
import requests
from pathlib import Path
from datetime import datetime
import csv

# Configuration
OMNI_2025_FOLDER = "/Users/waikiengoh/Downloads/OMNI 2025"
GOOGLE_CLOUD_API_KEY = os.environ.get("GOOGLE_CLOUD_API_KEY", "")
OUTPUT_CSV = "/tmp/omni_2025_invoices.csv"
OUTPUT_JSON = "/tmp/omni_2025_invoices.json"


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF using pdfplumber or PyPDF2"""
    try:
        # Try pdfplumber first (better for structured PDFs)
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text
    except ImportError:
        pass
    
    try:
        # Fallback to PyPDF2
        import PyPDF2
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
    except ImportError:
        pass
    
    try:
        # Fallback to pdf2image + Vision API for scanned PDFs
        from pdf2image import convert_from_path
        images = convert_from_path(pdf_path, first_page=1, last_page=1)
        if images:
            # Convert PIL Image to bytes
            import io
            img_byte_arr = io.BytesIO()
            images[0].save(img_byte_arr, format='PNG')
            img_bytes = img_byte_arr.getvalue()
            return extract_text_with_vision(img_bytes)
    except ImportError:
        pass
    
    return ""


def extract_text_with_vision(image_bytes: bytes) -> str:
    """Extract text from image using Google Vision API"""
    if not GOOGLE_CLOUD_API_KEY:
        print("⚠️  GOOGLE_CLOUD_API_KEY not set")
        return ""
    
    base64_image = base64.b64encode(image_bytes).decode('utf-8')
    
    url = f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_CLOUD_API_KEY}"
    payload = {
        "requests": [{
            "image": {"content": base64_image},
            "features": [{"type": "TEXT_DETECTION"}]
        }]
    }
    
    try:
        response = requests.post(url, json=payload)
        data = response.json()
        
        if 'responses' in data and data['responses']:
            annotations = data['responses'][0].get('textAnnotations', [])
            if annotations:
                return annotations[0].get('description', '')
    except Exception as e:
        print(f"❌ Vision API error: {e}")
    
    return ""


def parse_invoice_text(text: str, filename: str) -> dict:
    """Parse invoice text to extract key fields"""
    result = {
        'filename': filename,
        'invoice_number': None,
        'invoice_date': None,
        'recipient_name': None,
        'total_amount': None,
    }
    
    if not text:
        # Extract invoice number from filename
        match = re.search(r'([A-Z]{2,}-\d+)', filename, re.IGNORECASE)
        if match:
            result['invoice_number'] = match.group(1).upper()
        return result
    
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    # 1. INVOICE NUMBER
    inv_patterns = [
        r'INVOICE\s*[:\s]+([A-Z0-9]+-\d+)',
        r'Invoice\s*No\s*[:\s]*([A-Z0-9]+-\d+)',
        r'([A-Z]{2,5}-\d{3,})',
    ]
    for pattern in inv_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result['invoice_number'] = match.group(1).upper()
            break
    
    if not result['invoice_number']:
        match = re.search(r'([A-Z]{2,}-\d+)', filename, re.IGNORECASE)
        if match:
            result['invoice_number'] = match.group(1).upper()
    
    # 2. RECIPIENT NAME - Look for company names
    skip_patterns = [
        r'^(INVOICE|DATE|NO|TEL|FAX|EMAIL|PHONE|PAGE|REF|LOT|JALAN|Attn|Terms)',
        r'GLOBAL\s*GOODS|TRADING\s*SOLUTION',
        r'^\d|@',
        r'KAWASAN|PERUSAHAAN|KUALA\s*LUMPUR|SELANGOR|PERAK|JOHOR',
        r'^\d{5}\s',
    ]
    company_indicators = [
        'SDN', 'BHD', 'ENTERPRISE', 'GEMILANG', 'PUSTAKA', 
        'INDUSTRIES', 'CORPORATION', 'COMPANY', 'PLT', 
        'RESOURCES', 'MARKETING', 'TRADING'
    ]
    
    for i, line in enumerate(lines[:25]):
        if len(line) < 5 or len(line) > 60:
            continue
        
        # Skip unwanted patterns
        skip = False
        for pattern in skip_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                skip = True
                break
        if skip:
            continue
        
        # Check for company indicators
        for indicator in company_indicators:
            if indicator in line.upper():
                result['recipient_name'] = line
                break
        
        if result['recipient_name']:
            break
    
    # 3. DATE (DD/MM/YYYY or similar)
    date_patterns = [
        r'Date\s*[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})',
        r'(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})',
        r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})',
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            # Try to parse DD/MM/YYYY or DD-MM-YYYY
            for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%d/%m/%y', '%d-%m-%y']:
                try:
                    parsed_date = datetime.strptime(date_str, fmt)
                    result['invoice_date'] = parsed_date.strftime('%Y-%m-%d')
                    break
                except ValueError:
                    continue
            
            # Try Month name format
            if not result['invoice_date']:
                try:
                    parsed_date = datetime.strptime(date_str, '%d %B %Y')
                    result['invoice_date'] = parsed_date.strftime('%Y-%m-%d')
                except ValueError:
                    try:
                        parsed_date = datetime.strptime(date_str, '%d %b %Y')
                        result['invoice_date'] = parsed_date.strftime('%Y-%m-%d')
                    except ValueError:
                        pass
            
            if result['invoice_date']:
                break
    
    # 4. TOTAL AMOUNT
    total_patterns = [
        r'Total\s*\(?\s*RM\s*\)?\s*[:\s]*([\d,]+\.?\d*)',
        r'Grand\s*Total[:\s]*(?:RM\s*)?([\d,]+\.?\d*)',
        r'TOTAL\s*[:\s]*([\d,]+\.\d{2})',
        r'Total\s*Amount[:\s]*(?:RM\s*)?([\d,]+\.?\d*)',
    ]
    
    for pattern in total_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(',', '')
            try:
                result['total_amount'] = float(amount_str)
                break
            except ValueError:
                continue
    
    # Fallback: find largest amount
    if not result['total_amount']:
        amounts = []
        for match in re.finditer(r'([\d,]+\.\d{2})\b', text):
            try:
                amount = float(match.group(1).replace(',', ''))
                if amount > 100:  # Filter out small numbers
                    amounts.append(amount)
            except ValueError:
                continue
        
        if amounts:
            result['total_amount'] = max(amounts)
    
    return result


def process_invoices(folder_path: str) -> list:
    """Process all PDF files in the folder"""
    results = []
    folder = Path(folder_path)
    
    pdf_files = sorted(folder.glob('*.pdf'))
    print(f"📂 Found {len(pdf_files)} PDF files in {folder_path}")
    print()
    
    for i, pdf_path in enumerate(pdf_files, 1):
        print(f"[{i}/{len(pdf_files)}] Processing {pdf_path.name}...")
        
        # Extract text
        text = extract_text_from_pdf(str(pdf_path))
        
        # Parse invoice data
        invoice_data = parse_invoice_text(text, pdf_path.name)
        
        # Show results
        print(f"   📋 Invoice #: {invoice_data['invoice_number'] or 'N/A'}")
        print(f"   👤 Recipient: {invoice_data['recipient_name'] or 'N/A'}")
        print(f"   📅 Date: {invoice_data['invoice_date'] or 'N/A'}")
        print(f"   💰 Amount: RM {invoice_data['total_amount']:,.2f}" if invoice_data['total_amount'] else "   💰 Amount: N/A")
        print()
        
        results.append(invoice_data)
    
    return results


def save_results(results: list, csv_path: str, json_path: str):
    """Save results to CSV and JSON files"""
    # Save CSV
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['filename', 'invoice_number', 'invoice_date', 'recipient_name', 'total_amount'])
        writer.writeheader()
        writer.writerows(results)
    
    print(f"📊 CSV saved to: {csv_path}")
    
    # Save JSON
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"📊 JSON saved to: {json_path}")


def print_summary(results: list):
    """Print summary table"""
    print("\n" + "=" * 100)
    print("📋 INVOICE EXTRACTION SUMMARY")
    print("=" * 100)
    print()
    print(f"{'Invoice #':<15} {'Date':<12} {'Amount':>15} {'Recipient':<50}")
    print("-" * 100)
    
    total = 0
    for r in results:
        inv_num = r['invoice_number'] or 'N/A'
        date = r['invoice_date'] or 'N/A'
        amount = f"RM {r['total_amount']:,.2f}" if r['total_amount'] else 'N/A'
        recipient = (r['recipient_name'] or 'N/A')[:48]
        
        print(f"{inv_num:<15} {date:<12} {amount:>15} {recipient:<50}")
        
        if r['total_amount']:
            total += r['total_amount']
    
    print("-" * 100)
    print(f"{'TOTAL':<15} {'':<12} {'RM {:,.2f}'.format(total):>15}")
    print(f"\n📊 Processed: {len(results)} invoices")
    
    # Count extracted fields
    with_amount = sum(1 for r in results if r['total_amount'])
    with_date = sum(1 for r in results if r['invoice_date'])
    with_recipient = sum(1 for r in results if r['recipient_name'])
    
    print(f"   ✅ With Amount: {with_amount}/{len(results)}")
    print(f"   ✅ With Date: {with_date}/{len(results)}")
    print(f"   ✅ With Recipient: {with_recipient}/{len(results)}")


def main():
    print("🔍 INVOICE DATA EXTRACTOR")
    print("=" * 50)
    print()
    
    # Check if folder exists
    if not os.path.exists(OMNI_2025_FOLDER):
        print(f"❌ Folder not found: {OMNI_2025_FOLDER}")
        return
    
    # Process invoices
    results = process_invoices(OMNI_2025_FOLDER)
    
    # Print summary
    print_summary(results)
    
    # Save results
    save_results(results, OUTPUT_CSV, OUTPUT_JSON)
    
    print("\n✅ Done!")


if __name__ == "__main__":
    main()

