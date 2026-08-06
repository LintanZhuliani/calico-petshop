import re

with open('apps/frontend/src/components/CheckoutModal.jsx', 'r') as f:
    content = f.read()

# Add isAdmin to props
content = content.replace("export default function CheckoutModal({ cart, onClose, onConfirm }) {", "export default function CheckoutModal({ isAdmin, cart, onClose, onConfirm }) {\n  const primaryText = isAdmin ? 'text-[#D35400]' : 'text-[#C0392B]';\n  const primaryBg = isAdmin ? 'bg-[#D35400]' : 'bg-[#C0392B]';\n  const primaryLightBg = isAdmin ? 'bg-orange-50' : 'bg-red-50';\n  const primaryBorder = isAdmin ? 'border-[#D35400]' : 'border-[#C0392B]';\n  const primaryBorderLight = isAdmin ? 'border-orange-300' : 'border-red-300';")

# Replace colors
content = content.replace("'border-[#C0392B] bg-red-50 text-[#C0392B]'", "`border-[${isAdmin ? '#D35400' : '#C0392B'}] ${primaryLightBg} ${primaryText}`")
content = content.replace("bg-[#C0392B]", "${primaryBg}")
content = content.replace("text-[#C0392B]", "${primaryText}")
content = content.replace("bg-red-500", "${primaryBg}")
content = content.replace("text-red-500", "${primaryText}")
content = content.replace("text-red-400", "${primaryText}")
content = content.replace("hover:bg-red-50", "hover:${primaryLightBg}")
content = content.replace("bg-red-50", "${primaryLightBg}")
content = content.replace("border-red-300", "${primaryBorderLight}")

# Fix string templates where we just replaced inside quotes that weren't templates
content = content.replace("className=\"w-full py-4 ${primaryBg} text-white font-bold rounded-2xl text-base\"", "className={`w-full py-4 ${primaryBg} text-white font-bold rounded-2xl text-base`}")
content = content.replace("className=\"flex-1 py-4 ${primaryBg} text-white font-bold rounded-2xl disabled:opacity-50\"", "className={`flex-1 py-4 ${primaryBg} text-white font-bold rounded-2xl disabled:opacity-50`}")
content = content.replace("className=\"flex-1 py-4 ${primaryBg} text-white font-bold rounded-2xl disabled:opacity-50\">OK", "className={`flex-1 py-4 ${primaryBg} text-white font-bold rounded-2xl disabled:opacity-50`}>OK")

with open('apps/frontend/src/components/CheckoutModal.jsx', 'w') as f:
    f.write(content)
