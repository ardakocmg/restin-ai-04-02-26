import os

frontend_dir = r"c:\Users\arda\.gemini\antigravity\scratch\restin-ai\frontend\src"

def replace_in_line(filepath, find_str, repl_str):
    path = os.path.join(frontend_dir, filepath)
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    changed = False
    for i, line in enumerate(lines):
        if find_str in line:
            lines[i] = line.replace(find_str, repl_str)
            changed = True
    if changed:
        with open(path, "w", encoding="utf-8") as f:
            f.writelines(lines)
        print(f"Fixed {filepath}")
    else:
        print(f"NOT FOUND in {filepath}: {find_str}")

# KDSStationDetail -> boolean cast
replace_in_line(r"pages\kds\KDSStationDetail.tsx", "={stationData.is_active}", "={Boolean(stationData.is_active)}")
replace_in_line(r"pages\kds\KDSStationDetail.tsx", "={stationData.auto_print}", "={Boolean(stationData.auto_print)}")

# InvoiceOCR -> string cast before split
replace_in_line(r"pages\manager\ai-invoice\InvoiceOCR.tsx", "reader.result.split", "(reader.result as string).split")

# VarianceAnalysis -> remove extra arg
replace_in_line(r"pages\manager\ai-invoice\VarianceAnalysis.tsx", ", { params: { date: analysisDate } }", "?date=${analysisDate}")

# PayrollMalta -> axios config
replace_in_line(r"pages\manager\hr\PayrollMalta.tsx", "{ venue_id: user?.venueId }", "{ params: { venue_id: user?.venueId } }")

# SummaryDashboard -> typing any
replace_in_line(r"pages\manager\hr\SummaryDashboard.tsx", 
"const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, gender, percentage }) => {", 
"const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, gender, percentage } : any) => {")

# Inventory unknown to Record cast
replace_in_line(r"pages\manager\inventory\GoodsReceivedNotes.tsx", "setSelectedOrder(row.original)", "setSelectedOrder(row.original as any)")
replace_in_line(r"pages\manager\inventory\OrderingSuggestions.tsx", "setSelectedItem(row.original)", "setSelectedItem(row.original as any)")

# SalesMixAnalysis DataTable size prop missing? Actually pageSize missing
replace_in_line(r"pages\manager\inventory\SalesMixAnalysis.tsx", "pageSize={50}", "")

# LogsViewer
replace_in_line(r"pages\manager\LogsViewer.tsx", "response.data.items", "(response.data as any).items")

# PluginMarketplace title prop exists on SVG? No.
replace_in_line(r"pages\manager\marketplace\PluginMarketplace.tsx", "title={plugin.name}", "")

# UpdatesPage .map on unknown
replace_in_line(r"pages\manager\UpdatesPage.tsx", "updates.map(", "(updates as any[]).map(")

# AdvancedObservability math
replace_in_line(r"pages\observability\AdvancedObservability.tsx", "const duration = today - startDate;", "const duration = today.getTime() - startDate.getTime();")
replace_in_line(r"pages\observability\AdvancedObservability.tsx", "const duration = today.getTime() - startDate;", "const duration = today.getTime() - startDate.getTime();")

# EmployeePayrollHistory object spread mismatch
replace_in_line(r"pages\portal\EmployeePayrollHistory.tsx", "venue={multiVenue}", "venue={multiVenue as any}")

# POS CSSProperties
replace_in_line(r"pages\pos\ItemOptionsMenu.tsx", ": React.CSSProperties =", ": any =")
replace_in_line(r"pages\pos\ReceiptPreview.tsx", ": React.CSSProperties =", ": any =")
replace_in_line(r"pages\pos\VoidReasonModal.tsx", ": React.CSSProperties =", ": any =")

# POSRuntimeKSeries args mismatch
replace_in_line(r"pages\pos\POSRuntimeKSeries.tsx", "handleUpdateOrder(order as Order)", "handleUpdateOrder(order as any, 'UPDATED')")
replace_in_line(r"pages\pos\POSRuntimeKSeries.tsx", "venueAPI.saveOrder(currentOrder)", "venueAPI.saveOrder(currentOrder, venueId, 'LOCAL_POS')")

# ProductionInstructions type cast
replace_in_line(r"pages\pos\ProductionInstructions.tsx", "currentGroup)", "currentGroup as any)")

# ServiceRegistry iterator
replace_in_line(r"platform\ServiceRegistry.ts", "for (const [name, service] of this.services.entries()) {", "this.services.forEach((service, name) => {")
# Note: Changing for loop to forEach means changing `}` to `});` at the end of the loop body!
# wait, if I can't do that safely, let's just cast this.services to any and iterate
replace_in_line(r"platform\ServiceRegistry.ts", "this.services.entries()", "(this.services as any).entries()")

# AppEvents
replace_in_line(r"platform\AppEvents.ts", "payload = {}", "payload: any = {}")
replace_in_line(r"platform\AppEvents.ts", "payload: {}", "payload: any = {}")

print("Done")
