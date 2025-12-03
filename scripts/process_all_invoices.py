#!/usr/bin/env python3
"""
Process all invoices from multiple folders:
1. Extract data using Python OCR
2. Add payment with extracted amount/date
3. Upload invoice PDF
4. Link payment to invoice
"""

import os
import re
import json
import requests
from pathlib import Path
from datetime import datetime, timedelta
import random

# Configuration
FOLDERS = [
    "/Users/waikiengoh/Downloads/OMNI 2025",
    "/Users/waikiengoh/Downloads/gemilang 2025",
    "/Users/waikiengoh/Downloads/VGIFT 2025",
]

API_KEY = "inv_7ea0609b5f284f0d898519cfafe74996aac5819695d61b76a0eb6e595097efa7"
BASE_URL = "https://invoice-flow-410757682662.asia-southeast1.run.app/api"

# Import pdfplumber
try:
    import pdfplumber
except ImportError:
    print("❌ pdfplumber not installed. Run: pip install pdfplumber")
    exit(1)


def extract_invoice_data(pdf_path: str) -> dict:
    """Extract invoice data from PDF using pdfplumber"""
    result = {
        "invoice_number": None,
        "invoice_date": None,
        "recipient_name": None,
        "total_amount": None,
    }
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"      ⚠️ PDF read error: {e}")
        return result
    
    if not text:
        return result
    
    # Extract Invoice Number
    inv_patterns = [
        r'Invoice\s*No\s*[:\s]*([A-Z0-9]+-\d+)',
        r'INVOICE\s*[:\s]+([A-Z0-9]+-\d+)',
        r'([A-Z]{2,5}-\d{3,})',
    ]
    for pattern in inv_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result["invoice_number"] = match.group(1).upper()
            break
    
    # Fallback to filename
    if not result["invoice_number"]:
        fname = os.path.basename(pdf_path)
        match = re.search(r'([A-Z]{2,}-\d+)', fname, re.IGNORECASE)
        if match:
            result["invoice_number"] = match.group(1).upper()
    
    # Extract Date (DD/MM/YYYY)
    date_patterns = [
        r'Date\s*[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})',
        r'(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})',
    ]
    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            parts = re.split(r'[/\-]', date_str)
            if len(parts) == 3:
                day, month, year = parts
                if len(year) == 2:
                    year = "20" + year
                try:
                    result["invoice_date"] = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                    # Validate date
                    datetime.strptime(result["invoice_date"], "%Y-%m-%d")
                except:
                    result["invoice_date"] = None
            break
    
    # Extract Recipient Name
    skip_keywords = ['GLOBAL GOODS', 'TRADING SOLUTION', 'INVOICE', 'DATE', 'NO.', 'TEL', 'FAX']
    for line in text.split('\n')[:30]:
        line = line.strip()
        if len(line) < 5 or len(line) > 60:
            continue
        if any(kw in line.upper() for kw in skip_keywords):
            continue
        if re.match(r'^\d', line) or '@' in line:
            continue
        if any(ind in line.upper() for ind in ['SDN', 'BHD', 'ENTERPRISE', 'PLT', 'TRADING', 'RESOURCES']):
            # Clean up the recipient name
            result["recipient_name"] = re.sub(r'\s*(Ref|REF)\s*:?\s*$', '', line).strip()
            break
    
    # Extract Total Amount
    total_patterns = [
        r'Total\s*\(?\s*RM\s*\)?\s*[:\s]*([\d,]+\.?\d*)',
        r'Grand\s*Total[:\s]*(?:RM\s*)?([\d,]+\.?\d*)',
        r'TOTAL\s*[:\s]*([\d,]+\.\d{2})',
    ]
    for pattern in total_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                result["total_amount"] = float(match.group(1).replace(',', ''))
                break
            except:
                continue
    
    # Fallback: largest amount
    if not result["total_amount"]:
        amounts = []
        for match in re.finditer(r'([\d,]+\.\d{2})\b', text):
            try:
                amt = float(match.group(1).replace(',', ''))
                if amt > 100:
                    amounts.append(amt)
            except:
                continue
        if amounts:
            result["total_amount"] = max(amounts)
    
    return result


def create_payment(amount: float, invoice_date: str, description: str) -> dict:
    """Create a payment via API"""
    # Payment date is a few days after invoice date
    if invoice_date:
        inv_dt = datetime.strptime(invoice_date, "%Y-%m-%d")
        pay_dt = inv_dt + timedelta(days=random.randint(2, 14))
        payment_date = pay_dt.strftime("%Y-%m-%d")
    else:
        payment_date = datetime.now().strftime("%Y-%m-%d")
    
    response = requests.post(
        f"{BASE_URL}/payments",
        headers={
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        },
        json={
            "amount": amount,
            "date": payment_date,
            "description": description
        }
    )
    
    if response.ok:
        return response.json()
    else:
        return None


def upload_invoice(pdf_path: str, invoice_data: dict) -> dict:
    """Upload invoice PDF via API"""
    with open(pdf_path, 'rb') as f:
        files = {'file': (os.path.basename(pdf_path), f, 'application/pdf')}
        data = {}
        
        if invoice_data["invoice_number"]:
            data["invoiceNumber"] = invoice_data["invoice_number"]
        if invoice_data["invoice_date"]:
            data["invoiceDate"] = invoice_data["invoice_date"]
        if invoice_data["recipient_name"]:
            data["recipientName"] = invoice_data["recipient_name"]
        if invoice_data["total_amount"]:
            data["totalAmount"] = str(invoice_data["total_amount"])
        
        response = requests.post(
            f"{BASE_URL}/invoices",
            headers={"X-API-Key": API_KEY},
            files=files,
            data=data
        )
    
    if response.ok:
        return response.json()
    else:
        return None


def link_payment_to_invoice(payment_id: str, invoice_id: str) -> bool:
    """Link a payment to an invoice"""
    response = requests.put(
        f"{BASE_URL}/payments/{payment_id}",
        headers={
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        },
        json={"invoiceId": invoice_id}
    )
    return response.ok


def process_folder(folder_path: str) -> list:
    """Process all PDFs in a folder"""
    results = []
    folder = Path(folder_path)
    folder_name = folder.name
    
    pdf_files = sorted(folder.glob('*.pdf'))
    print(f"\n📂 {folder_name}: {len(pdf_files)} PDFs")
    print("-" * 60)
    
    for i, pdf_path in enumerate(pdf_files, 1):
        print(f"[{i}/{len(pdf_files)}] {pdf_path.name}")
        
        # Step 1: Extract data
        invoice_data = extract_invoice_data(str(pdf_path))
        
        if not invoice_data["total_amount"]:
            print(f"      ⚠️ Skipped - no amount extracted")
            results.append({"file": pdf_path.name, "status": "skipped", "reason": "no amount"})
            continue
        
        print(f"      📋 {invoice_data['invoice_number']} | {invoice_data['invoice_date']} | RM {invoice_data['total_amount']:,.2f}")
        
        # Step 2: Create payment
        payment = create_payment(
            invoice_data["total_amount"],
            invoice_data["invoice_date"],
            f"Payment for {invoice_data['invoice_number'] or pdf_path.name}"
        )
        
        if not payment:
            print(f"      ❌ Failed to create payment")
            results.append({"file": pdf_path.name, "status": "failed", "reason": "payment creation failed"})
            continue
        
        # Step 3: Upload invoice
        invoice = upload_invoice(str(pdf_path), invoice_data)
        
        if not invoice:
            print(f"      ❌ Failed to upload invoice")
            results.append({"file": pdf_path.name, "status": "failed", "reason": "invoice upload failed"})
            continue
        
        # Step 4: Link payment to invoice
        linked = link_payment_to_invoice(payment["id"], invoice["id"])
        
        if linked:
            print(f"      ✅ Matched!")
            results.append({
                "file": pdf_path.name,
                "status": "success",
                "invoice_number": invoice_data["invoice_number"],
                "invoice_date": invoice_data["invoice_date"],
                "amount": invoice_data["total_amount"],
                "recipient": invoice_data["recipient_name"],
                "payment_id": payment["id"],
                "invoice_id": invoice["id"]
            })
        else:
            print(f"      ⚠️ Uploaded but failed to link")
            results.append({"file": pdf_path.name, "status": "partial", "reason": "linking failed"})
    
    return results


def main():
    print("=" * 60)
    print("🚀 PROCESSING ALL INVOICES")
    print("=" * 60)
    
    all_results = []
    
    for folder in FOLDERS:
        if os.path.exists(folder):
            results = process_folder(folder)
            all_results.extend(results)
        else:
            print(f"\n❌ Folder not found: {folder}")
    
    # Summary
    success = [r for r in all_results if r["status"] == "success"]
    failed = [r for r in all_results if r["status"] == "failed"]
    skipped = [r for r in all_results if r["status"] == "skipped"]
    
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    print(f"  ✅ Success:  {len(success)}")
    print(f"  ❌ Failed:   {len(failed)}")
    print(f"  ⏭️  Skipped:  {len(skipped)}")
    print(f"  📋 Total:    {len(all_results)}")
    
    if success:
        total_amount = sum(r["amount"] for r in success)
        print(f"\n  💰 Total Amount: RM {total_amount:,.2f}")
    
    # Save results
    output_path = "/tmp/all_invoices_processed.json"
    with open(output_path, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\n💾 Results saved to: {output_path}")


if __name__ == "__main__":
    main()

