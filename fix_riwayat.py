import re

with open('apps/frontend/src/pages/RiwayatPage.jsx', 'r') as f:
    content = f.read()

# Replace receipt text print
old_print = """    if (tx.additionalFee > 0) {
      text += pad(tx.additionalFeeType || 'Biaya Tambahan', tx.additionalFee.toLocaleString('id-ID')) + '\\n';
    }"""
new_print = """    if (tx.additionalFee > 0) {
      if (tx.additionalFeesDetails) {
        try {
          const fees = JSON.parse(tx.additionalFeesDetails);
          fees.forEach(fee => {
            if (fee.name && fee.amount) {
              text += pad(`Biaya: ${fee.name}`, Number(fee.amount).toLocaleString('id-ID')) + '\\n';
            }
          });
        } catch (e) {
          text += pad('Biaya Tambahan', tx.additionalFee.toLocaleString('id-ID')) + '\\n';
        }
      } else {
        text += pad('Biaya Tambahan', tx.additionalFee.toLocaleString('id-ID')) + '\\n';
      }
    }"""
content = content.replace(old_print, new_print)

# Replace UI render
old_ui = """                {selectedTx.additionalFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Biaya: {selectedTx.additionalFeeType || 'Lainnya'}</span>
                    <span className="font-bold text-slate-800">{formatRupiah(selectedTx.additionalFee)}</span>
                  </div>
                )}"""
new_ui = """                {selectedTx.additionalFee > 0 && (
                  (() => {
                    if (selectedTx.additionalFeesDetails) {
                      try {
                        const fees = JSON.parse(selectedTx.additionalFeesDetails);
                        return fees.map((fee, idx) => fee.name && fee.amount ? (
                          <div key={idx} className="flex justify-between">
                            <span className="text-slate-500">Biaya: {fee.name}</span>
                            <span className="font-bold text-slate-800">{formatRupiah(fee.amount)}</span>
                          </div>
                        ) : null);
                      } catch (e) {
                        return (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Biaya Tambahan</span>
                            <span className="font-bold text-slate-800">{formatRupiah(selectedTx.additionalFee)}</span>
                          </div>
                        );
                      }
                    }
                    return (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Biaya Tambahan</span>
                        <span className="font-bold text-slate-800">{formatRupiah(selectedTx.additionalFee)}</span>
                      </div>
                    );
                  })()
                )}"""
content = content.replace(old_ui, new_ui)

with open('apps/frontend/src/pages/RiwayatPage.jsx', 'w') as f:
    f.write(content)
