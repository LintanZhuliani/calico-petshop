import re

with open('apps/frontend/src/components/CheckoutModal.jsx', 'r') as f:
    content = f.read()

# Replace states
content = re.sub(
    r"const \[hasAdditionalFee, setHasAdditionalFee\] = useState\(false\);\n  const \[additionalFeeType, setAdditionalFeeType\] = useState\(''\);\n  const \[additionalFeeAmt, setAdditionalFeeAmt\] = useState\(''\);\n  const \[showFeeOptions, setShowFeeOptions\] = useState\(false\);",
    r"const [hasAdditionalFee, setHasAdditionalFee] = useState(false);\n  const [additionalFees, setAdditionalFees] = useState([]);\n  const [showFeeOptions, setShowFeeOptions] = useState(false);\n  const [feeTargetIndex, setFeeTargetIndex] = useState(null);",
    content
)

# Replace feeTotal calculation
content = re.sub(
    r"const feeTotal = hasAdditionalFee \? parseAmount\(additionalFeeAmt\) : 0;",
    r"const feeTotal = hasAdditionalFee ? additionalFees.reduce((sum, fee) => sum + parseAmount(fee.amount), 0) : 0;",
    content
)

# Replace baseData
content = re.sub(
    r"      const baseData = \{\n        additionalFee: feeTotal,\n        additionalFeeType: hasAdditionalFee \? additionalFeeType : null,\n      \};",
    r"      const baseData = {\n        additionalFee: feeTotal,\n        additionalFeesDetails: hasAdditionalFee ? JSON.stringify(additionalFees) : null,\n      };",
    content
)

# Replace UI
old_ui = """      <div className="flex flex-col gap-2 py-2 border-b">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">Biaya Tambahan</span>
          <button
            onClick={() => { setHasAdditionalFee(!hasAdditionalFee); if (hasAdditionalFee) setAdditionalFeeAmt(''); }}
            className={`w-10 h-6 rounded-full relative transition-all ${hasAdditionalFee ? 'bg-[#C0392B]' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hasAdditionalFee ? 'right-1' : 'left-1'}`}></span>
          </button>
        </div>
        {hasAdditionalFee && (
          <div className="bg-slate-50 p-3 rounded-xl space-y-3">
            <button onClick={() => setShowFeeOptions(true)} className="w-full py-2 border-2 border-dashed border-red-300 text-red-500 font-bold rounded-xl text-sm hover:bg-red-50">
              {additionalFeeType ? `Biaya: ${additionalFeeType}` : '+ Biaya Tambahan'}
            </button>
            {additionalFeeType && (
              <InputField label="Nominal Biaya" type="number" value={additionalFeeAmt} onChange={setAdditionalFeeAmt} placeholder="Rp 0" />
            )}
          </div>
        )}
      </div>

      {showFeeOptions && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4">
            <h3 className="font-bold text-lg text-center">Pilih Biaya Tambahan</h3>
            <div className="space-y-2">
              {['Pajak', 'Ongkos Kirim', 'Kemasan', 'Lainnya (Ketik Sendiri)...'].map(opt => (
                <button
                  key={opt}
                  onClick={() => { 
                    if (opt.startsWith('Lainnya')) {
                      setAdditionalFeeType(prompt('Masukkan nama biaya tambahan:'));
                    } else {
                      setAdditionalFeeType(opt); 
                    }
                    setShowFeeOptions(false); 
                  }}
                  className="w-full text-left py-3 px-4 rounded-xl font-bold bg-slate-50 hover:bg-slate-100 border"
                >
                  {opt}
                </button>
              ))}
            </div>
            <button onClick={() => setShowFeeOptions(false)} className="w-full py-3 bg-slate-200 font-bold rounded-xl text-slate-600">Batal</button>
          </div>
        </div>
      )}"""

new_ui = """      <div className="flex flex-col gap-2 py-2 border-b">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">Biaya Tambahan</span>
          <button
            onClick={() => { 
              const next = !hasAdditionalFee;
              setHasAdditionalFee(next); 
              if (next && additionalFees.length === 0) setAdditionalFees([{ name: '', amount: '' }]);
              if (!next) setAdditionalFees([]);
            }}
            className={`w-10 h-6 rounded-full relative transition-all ${hasAdditionalFee ? 'bg-[#C0392B]' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hasAdditionalFee ? 'right-1' : 'left-1'}`}></span>
          </button>
        </div>
        {hasAdditionalFee && (
          <div className="bg-slate-50 p-3 rounded-xl space-y-3">
            {additionalFees.map((fee, idx) => (
              <div key={idx} className="space-y-2 bg-white p-3 rounded-lg border relative">
                {additionalFees.length > 1 && (
                  <button onClick={() => setAdditionalFees(prev => prev.filter((_, i) => i !== idx))} className="absolute right-2 top-2 text-slate-400 hover:text-red-500">
                    <span className="material-symbols-outlined !text-[18px]">close</span>
                  </button>
                )}
                <button onClick={() => { setFeeTargetIndex(idx); setShowFeeOptions(true); }} className="w-full py-2 border-2 border-dashed border-red-300 text-red-500 font-bold rounded-xl text-sm hover:bg-red-50">
                  {fee.name ? `Biaya: ${fee.name}` : 'Pilih Jenis Biaya...'}
                </button>
                {fee.name && (
                  <InputField label="Nominal Biaya" type="number" value={fee.amount} onChange={(val) => {
                    setAdditionalFees(prev => {
                      const next = [...prev];
                      next[idx].amount = val;
                      return next;
                    });
                  }} placeholder="Rp 0" />
                )}
              </div>
            ))}
            <button onClick={() => setAdditionalFees(prev => [...prev, { name: '', amount: '' }])} className="w-full py-2 font-bold text-[#C0392B] text-sm hover:bg-red-50 rounded-xl">
              + Tambah Biaya Lainnya
            </button>
          </div>
        )}
      </div>

      {showFeeOptions && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4">
            <h3 className="font-bold text-lg text-center">Pilih Biaya Tambahan</h3>
            <div className="space-y-2">
              {['Pajak', 'Ongkos Kirim', 'Kemasan', 'Lainnya (Ketik Sendiri)...'].map(opt => (
                <button
                  key={opt}
                  onClick={() => { 
                    let name = opt;
                    if (opt.startsWith('Lainnya')) {
                      name = prompt('Masukkan nama biaya tambahan:') || '';
                    }
                    if (name) {
                      setAdditionalFees(prev => {
                        const next = [...prev];
                        next[feeTargetIndex].name = name;
                        return next;
                      });
                    }
                    setShowFeeOptions(false); 
                  }}
                  className="w-full text-left py-3 px-4 rounded-xl font-bold bg-slate-50 hover:bg-slate-100 border"
                >
                  {opt}
                </button>
              ))}
            </div>
            <button onClick={() => setShowFeeOptions(false)} className="w-full py-3 bg-slate-200 font-bold rounded-xl text-slate-600">Batal</button>
          </div>
        </div>
      )}"""

content = content.replace(old_ui, new_ui)

with open('apps/frontend/src/components/CheckoutModal.jsx', 'w') as f:
    f.write(content)
