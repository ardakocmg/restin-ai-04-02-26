import codecs

# 1. OrderProfiles.tsx
op_path = "frontend/src/pages/pos/OrderProfiles.tsx"
with codecs.open(op_path, 'r', 'utf-8') as f:
    text = f.read()
text = text.replace(") as any, deliveryDelay:", ") as OrderProfile['takeawayMode'], deliveryDelay:")
text = text.replace(") as any, serviceCharge:", ") as OrderProfile['deliveryDelay'], serviceCharge:")
with codecs.open(op_path, 'w', 'utf-8') as f:
    f.write(text)

# 2. PaymentMethods.tsx
pm_path = "frontend/src/pages/pos/PaymentMethods.tsx"
with codecs.open(pm_path, 'r', 'utf-8') as f:
    text = f.read()
text = text.replace(") as any, isActive:", ") as PaymentMethod['type'], isActive:")
with codecs.open(pm_path, 'w', 'utf-8') as f:
    f.write(text)

# 3. ComboMeals.tsx
cm_path = "frontend/src/pages/pos/ComboMeals.tsx"
with codecs.open(cm_path, 'r', 'utf-8') as f:
    text = f.read()
text = text.replace("apiCombos.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any", "(apiCombos as unknown as Record<string, unknown>[]).map(")
with codecs.open(cm_path, 'w', 'utf-8') as f:
    f.write(text)
