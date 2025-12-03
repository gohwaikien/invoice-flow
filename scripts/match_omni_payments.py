#!/usr/bin/env python3
"""
Match OMNI 2025 invoices with payments awaiting invoices
Logic:
1. Match by exact amount
2. If multiple invoices have same amount, pick closest date to payment date
"""

import json
from datetime import datetime
from collections import defaultdict

# Payments awaiting invoices (from database)
PAYMENTS = [
    {"date": "2025-03-03", "amount": 20656.50},
    {"date": "2025-03-04", "amount": 39454.50},
    {"date": "2025-03-12", "amount": 51750.30},
    {"date": "2025-03-12", "amount": 41759.20},
    {"date": "2025-03-12", "amount": 38111.10},
    {"date": "2025-03-20", "amount": 19636.60},
    {"date": "2025-03-24", "amount": 24265.10},
    {"date": "2025-03-25", "amount": 31877.23},
    {"date": "2025-03-27", "amount": 52033.40},
    {"date": "2025-04-01", "amount": 4856.80},
    {"date": "2025-04-07", "amount": 67963.50},
    {"date": "2025-04-10", "amount": 31877.30},
    {"date": "2025-04-10", "amount": 10912.60},
    {"date": "2025-04-10", "amount": 36066.00},
    {"date": "2025-04-17", "amount": 7707.80},
    {"date": "2025-04-17", "amount": 10532.00},
    {"date": "2025-04-28", "amount": 43267.20},
    {"date": "2025-04-28", "amount": 12008.80},
    {"date": "2025-05-03", "amount": 43549.50},
    {"date": "2025-06-04", "amount": 30149.30},
    {"date": "2025-06-09", "amount": 52045.20},
    {"date": "2025-06-21", "amount": 20526.00},
    {"date": "2025-06-21", "amount": 26166.40},
    {"date": "2025-06-26", "amount": 26425.50},
    {"date": "2025-06-26", "amount": 30447.80},
    {"date": "2025-06-28", "amount": 26675.10},
    {"date": "2025-07-02", "amount": 30722.10},
    {"date": "2025-07-06", "amount": 16635.00},
    {"date": "2025-07-09", "amount": 22933.40},
    {"date": "2025-07-16", "amount": 19084.50},
    {"date": "2025-07-16", "amount": 80144.70},
    {"date": "2025-07-18", "amount": 7133.90},
    {"date": "2025-07-31", "amount": 21321.60},
    {"date": "2025-08-01", "amount": 11072.30},
    {"date": "2025-08-06", "amount": 21974.50},
    {"date": "2025-08-10", "amount": 21512.10},
    {"date": "2025-08-10", "amount": 15058.80},
    {"date": "2025-08-18", "amount": 8171.90},
    {"date": "2025-08-19", "amount": 24047.62},
    {"date": "2025-08-26", "amount": 14558.55},
    {"date": "2025-08-29", "amount": 27530.60},
    {"date": "2025-09-03", "amount": 12815.70},
    {"date": "2025-09-09", "amount": 21720.30},
    {"date": "2025-09-25", "amount": 10960.50},
    {"date": "2025-09-27", "amount": 6084.35},
    {"date": "2025-09-30", "amount": 2894.50},
    {"date": "2025-10-01", "amount": 30239.50},
    {"date": "2025-10-12", "amount": 6095.35},
    {"date": "2025-10-14", "amount": 30203.35},
    {"date": "2025-10-16", "amount": 26710.35},
    {"date": "2025-10-17", "amount": 7628.40},
    {"date": "2025-10-17", "amount": 21028.40},
    {"date": "2025-10-21", "amount": 40136.60},
    {"date": "2025-10-23", "amount": 19496.00},
    {"date": "2025-10-23", "amount": 10595.20},
    {"date": "2025-10-28", "amount": 22761.40},
    {"date": "2025-10-29", "amount": 33908.90},
    {"date": "2025-11-05", "amount": 15471.50},
    {"date": "2025-11-05", "amount": 285.05},
    {"date": "2025-11-06", "amount": 19837.15},
    {"date": "2025-11-13", "amount": 17823.60},
    {"date": "2025-11-25", "amount": 8112.10},
    {"date": "2025-11-28", "amount": 24079.70},
]

# OMNI 2025 Invoices (from extraction)
INVOICES = [
    {"invoice_number": "GGTS-0801", "invoice_date": "2025-02-07", "total_amount": 4453.00},
    {"invoice_number": "GGTS-0831", "invoice_date": "2025-02-28", "total_amount": 8164.70},
    {"invoice_number": "GGTS-0834", "invoice_date": "2025-02-28", "total_amount": 27932.70},
    {"invoice_number": "GGTS-0859", "invoice_date": "2025-03-21", "total_amount": 9448.20},
    {"invoice_number": "GGTS-0860", "invoice_date": "2025-03-21", "total_amount": 28136.60},
    {"invoice_number": "GGTS-0880", "invoice_date": "2025-04-21", "total_amount": 28442.40},
    {"invoice_number": "GGTS-0883", "invoice_date": "2025-04-21", "total_amount": 27321.00},
    {"invoice_number": "GGTS-0900", "invoice_date": "2025-02-18", "total_amount": 26501.90},
    {"invoice_number": "GGTS-0901", "invoice_date": "2025-02-19", "total_amount": 10309.20},
    {"invoice_number": "GGTS-0902", "invoice_date": "2025-02-20", "total_amount": 7441.60},
    {"invoice_number": "GGTS-0903", "invoice_date": "2025-05-05", "total_amount": 1250.00},
    {"invoice_number": "GGTS-0904", "invoice_date": "2025-05-05", "total_amount": 3952.00},
    {"invoice_number": "GGTS-0950", "invoice_date": "2025-05-07", "total_amount": 27500.00},
    {"invoice_number": "GGTS-0951", "invoice_date": "2025-05-07", "total_amount": 26600.00},
    {"invoice_number": "GGTS-0952", "invoice_date": "2025-05-07", "total_amount": 7416.50},
    {"invoice_number": "GGTS-0976", "invoice_date": "2025-05-30", "total_amount": 26770.00},
    {"invoice_number": "GGTS-0978", "invoice_date": "2025-02-25", "total_amount": 3469.28},
    {"invoice_number": "GGTS-0979", "invoice_date": "2025-02-27", "total_amount": 42213.10},
    {"invoice_number": "GGTS-0980", "invoice_date": "2025-02-25", "total_amount": 84471.60},
    {"invoice_number": "GGTS-0981", "invoice_date": "2025-02-26", "total_amount": 76909.20},
    {"invoice_number": "GGTS-0985", "invoice_date": "2025-03-10", "total_amount": 51750.30},
    {"invoice_number": "GGTS-0988", "invoice_date": "2025-05-07", "total_amount": 78475.13},
    {"invoice_number": "GGTS-0990", "invoice_date": "2025-03-25", "total_amount": 52033.40},
    {"invoice_number": "GGTS-0991", "invoice_date": "2025-06-05", "total_amount": 3952.00},
    {"invoice_number": "GGTS-0994", "invoice_date": "2025-06-05", "total_amount": 9369.50},
    {"invoice_number": "GGTS-1015", "invoice_date": "2025-03-01", "total_amount": 4028.90},
    {"invoice_number": "GGTS-1016", "invoice_date": "2025-04-03", "total_amount": 3875.20},
    {"invoice_number": "GGTS-1017", "invoice_date": "2025-06-23", "total_amount": 1500.00},
    {"invoice_number": "GGTS-1018", "invoice_date": "2025-04-03", "total_amount": 10912.60},
    {"invoice_number": "GGTS-1020", "invoice_date": "2025-05-05", "total_amount": 65842.90},
    {"invoice_number": "GGTS-1028", "invoice_date": "2025-07-02", "total_amount": 3952.00},
    {"invoice_number": "GGTS-1031", "invoice_date": "2025-04-20", "total_amount": 509.60},
    {"invoice_number": "GGTS-1088", "invoice_date": "2025-07-21", "total_amount": 6279.00},
    {"invoice_number": "GGTS-1091", "invoice_date": "2025-08-01", "total_amount": 1250.00},
    {"invoice_number": "GGTS-1098", "invoice_date": "2025-08-07", "total_amount": 3796.00},
    {"invoice_number": "GGTS-1105", "invoice_date": "2025-09-09", "total_amount": 3879.20},
    {"invoice_number": "GGTS-1106", "invoice_date": "2025-09-09", "total_amount": 1250.00},
    {"invoice_number": "GGTS-1108", "invoice_date": "2025-09-11", "total_amount": 9560.00},
    {"invoice_number": "GGTS-1110", "invoice_date": "2025-09-11", "total_amount": 13200.00},
    {"invoice_number": "GGTS-1122", "invoice_date": "2025-05-16", "total_amount": 31531.40},
    {"invoice_number": "GGTS-1123", "invoice_date": "2025-05-20", "total_amount": 18993.50},
    {"invoice_number": "GGTS-1125", "invoice_date": "2025-06-19", "total_amount": 57122.90},
    {"invoice_number": "GGTS-1188", "invoice_date": "2025-10-04", "total_amount": 1250.00},
    {"invoice_number": "GGTS-1189", "invoice_date": "2025-10-04", "total_amount": 3311.40},
    {"invoice_number": "GGTS-1204", "invoice_date": "2025-10-23", "total_amount": 819.00},
    {"invoice_number": "GGTS-1224", "invoice_date": "2025-07-13", "total_amount": 19084.50},
    {"invoice_number": "GGTS-1225", "invoice_date": "2025-07-14", "total_amount": 80144.70},
    {"invoice_number": "GGTS-1226", "invoice_date": "2025-07-15", "total_amount": 7133.90},
    {"invoice_number": "GGTS-1233", "invoice_date": "2025-08-13", "total_amount": 8171.90},
    {"invoice_number": "GGTS-1236", "invoice_date": "2025-11-07", "total_amount": 1250.00},
    {"invoice_number": "GGTS-1237", "invoice_date": "2025-11-07", "total_amount": 3900.00},
    {"invoice_number": "GGTS-1239", "invoice_date": "2025-11-07", "total_amount": 455.00},
    {"invoice_number": "GGTS-1290", "invoice_date": "2025-11-15", "total_amount": 7873.50},
    {"invoice_number": "GGTS-1304", "invoice_date": "2025-12-03", "total_amount": 3879.20},
    {"invoice_number": "GGTS-1305", "invoice_date": "2025-12-03", "total_amount": 1250.00},
]


def parse_date(date_str):
    return datetime.strptime(date_str, "%Y-%m-%d")


def days_between(date1, date2):
    d1 = parse_date(date1)
    d2 = parse_date(date2)
    return abs((d1 - d2).days)


def match_payments_to_invoices():
    """Match payments to invoices by amount, then by closest date"""
    
    # Build index of invoices by amount
    invoice_by_amount = defaultdict(list)
    for inv in INVOICES:
        invoice_by_amount[inv["total_amount"]].append(inv)
    
    # Track used invoices
    used_invoices = set()
    
    matches = []
    unmatched_payments = []
    
    for i, payment in enumerate(PAYMENTS):
        payment_amount = payment["amount"]
        payment_date = payment["date"]
        
        # Find invoices with matching amount
        matching_invoices = [
            inv for inv in invoice_by_amount.get(payment_amount, [])
            if inv["invoice_number"] not in used_invoices
        ]
        
        if not matching_invoices:
            unmatched_payments.append(payment)
            continue
        
        # If only one match, use it
        if len(matching_invoices) == 1:
            best_match = matching_invoices[0]
        else:
            # Multiple matches - pick closest date
            best_match = min(
                matching_invoices,
                key=lambda inv: days_between(payment_date, inv["invoice_date"])
            )
        
        # Record match
        used_invoices.add(best_match["invoice_number"])
        matches.append({
            "payment_date": payment_date,
            "payment_amount": payment_amount,
            "invoice_number": best_match["invoice_number"],
            "invoice_date": best_match["invoice_date"],
            "invoice_amount": best_match["total_amount"],
            "date_diff_days": days_between(payment_date, best_match["invoice_date"]),
        })
    
    return matches, unmatched_payments


def main():
    print("=" * 100)
    print("📋 PAYMENT - INVOICE MATCHING (OMNI 2025)")
    print("=" * 100)
    print()
    print(f"📊 Payments: {len(PAYMENTS)}")
    print(f"📊 Invoices: {len(INVOICES)}")
    print()
    
    matches, unmatched = match_payments_to_invoices()
    
    # Print matches
    print("=" * 100)
    print("✅ MATCHED PAYMENTS")
    print("=" * 100)
    print()
    print(f"{'Payment Date':<14} {'Amount':>14} {'Invoice #':<14} {'Invoice Date':<14} {'Days Diff':>10}")
    print("-" * 100)
    
    total_matched = 0
    for m in matches:
        print(f"{m['payment_date']:<14} RM {m['payment_amount']:>11,.2f} {m['invoice_number']:<14} {m['invoice_date']:<14} {m['date_diff_days']:>10}")
        total_matched += m['payment_amount']
    
    print("-" * 100)
    print(f"{'TOTAL':<14} RM {total_matched:>11,.2f}")
    print()
    print(f"✅ Matched: {len(matches)} payments (RM {total_matched:,.2f})")
    
    # Print unmatched
    if unmatched:
        print()
        print("=" * 100)
        print("❌ UNMATCHED PAYMENTS (No matching invoice amount)")
        print("=" * 100)
        print()
        print(f"{'Payment Date':<14} {'Amount':>14}")
        print("-" * 40)
        
        total_unmatched = 0
        for p in unmatched:
            print(f"{p['date']:<14} RM {p['amount']:>11,.2f}")
            total_unmatched += p['amount']
        
        print("-" * 40)
        print(f"{'TOTAL':<14} RM {total_unmatched:>11,.2f}")
        print()
        print(f"❌ Unmatched: {len(unmatched)} payments (RM {total_unmatched:,.2f})")
    
    # Summary
    print()
    print("=" * 100)
    print("📊 SUMMARY")
    print("=" * 100)
    print(f"  ✅ Matched:   {len(matches):>3} payments = RM {total_matched:>14,.2f}")
    print(f"  ❌ Unmatched: {len(unmatched):>3} payments = RM {sum(p['amount'] for p in unmatched):>14,.2f}")
    print(f"  📋 Total:     {len(PAYMENTS):>3} payments = RM {sum(p['amount'] for p in PAYMENTS):>14,.2f}")
    
    # Save mapping to file
    output = {
        "matches": matches,
        "unmatched_payments": unmatched,
        "summary": {
            "total_payments": len(PAYMENTS),
            "matched": len(matches),
            "unmatched": len(unmatched),
            "matched_amount": total_matched,
            "unmatched_amount": sum(p['amount'] for p in unmatched),
        }
    }
    
    with open("/tmp/omni_payment_invoice_mapping.json", "w") as f:
        json.dump(output, f, indent=2)
    
    print()
    print(f"💾 Mapping saved to: /tmp/omni_payment_invoice_mapping.json")


if __name__ == "__main__":
    main()

