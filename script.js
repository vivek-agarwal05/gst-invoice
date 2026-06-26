/* ============================================================
   GST INVOICE GENERATOR — script.js
   ============================================================ */

// ── State ──────────────────────────────────────────────────
let logoB64  = '';
let sigB64   = '';
let gstRate  = 0;      // numeric e.g. 18
let gstMode  = 'cgst_sgst'; // 'cgst_sgst' | 'igst' | 'none'

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setToday();
  loadSettingsIntoForm();
  renderHistory();
  updateDashboard();
  addProductRow();
  recalc();
});

// ── Navigation ─────────────────────────────────────────────
function navigate(pageId, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');

  if (el) {
    el.classList.add('active');
  } else {
    // called programmatically — highlight matching link
    document.querySelectorAll('.nav-link').forEach(n => {
      if (n.getAttribute('onclick') && n.getAttribute('onclick').includes(pageId)) {
        n.classList.add('active');
      }
    });
  }

  if (pageId === 'history')   renderHistory();
  if (pageId === 'dashboard') updateDashboard();
}

// ── Date helper ────────────────────────────────────────────
function setToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const el = document.getElementById('invoiceDate');
  if (el && !el.value) el.value = `${y}-${m}-${dd}`;
}

function fmtDate(str) {
  if (!str) return '';
  const [y,m,d] = str.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d}-${months[parseInt(m,10)-1]}-${y}`;
}

// ── Product rows ───────────────────────────────────────────
function addProductRow() {
  const tbody = document.getElementById('productBody');
  const idx   = tbody.rows.length + 1;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td style="text-align:center">${idx}</td>
    <td><input type="text"   class="p-desc"  placeholder="Product description" oninput="recalc()"></td>
    <td><input type="text"   class="p-hsn"   placeholder="HSN/SAC"></td>
    <td>
      <div style="display:flex;gap:4px;align-items:center">
        <input type="number" class="p-qty"   placeholder="0" step="0.001" min="0" oninput="calcRow(this);recalc()" style="width:60px">
        <input type="text"   class="p-unit"  placeholder="Nos" style="width:40px">
      </div>
    </td>
    <td><input type="text"   class="p-per"   placeholder="Nos" style="width:45px"></td>
    <td><input type="number" class="p-rate-incl" placeholder="0.00" step="0.01" min="0" oninput="calcRow(this);recalc()" style="width:90px"></td>
    <td><input type="number" class="p-rate-excl" placeholder="0.00" step="0.01" min="0" readonly style="background:#f5f5f5"></td>
    <td><input type="number" class="p-amount"    placeholder="0.00" readonly style="background:#f5f5f5"></td>
    <td>
      <select class="p-vat" onchange="calcRow(this);recalc()" style="width:55px">
        <option value="0">0%</option>
        <option value="5">5%</option>
        <option value="12">12%</option>
        <option value="18">18%</option>
        <option value="28">28%</option>
      </select>
    </td>
    <td><button class="del-btn" onclick="delRow(this)">✕</button></td>`;
  tbody.appendChild(tr);
}

function calcRow(input) {
  const tr  = input.closest('tr');
  const qty        = parseFloat(tr.querySelector('.p-qty').value)       || 0;
  const rateIncl   = parseFloat(tr.querySelector('.p-rate-incl').value) || 0;
  const vatPct     = parseFloat(tr.querySelector('.p-vat').value)       || 0;

  // rate excl of tax  = rateIncl / (1 + vatPct/100)
  const rateExcl = vatPct > 0 ? rateIncl / (1 + vatPct / 100) : rateIncl;
  const amount   = qty * rateExcl;

  tr.querySelector('.p-rate-excl').value = rateExcl.toFixed(2);
  tr.querySelector('.p-amount').value    = amount.toFixed(2);
}

function delRow(btn) {
  btn.closest('tr').remove();
  // renumber
  document.querySelectorAll('#productBody tr').forEach((tr,i) => {
    tr.cells[0].textContent = i + 1;
  });
  recalc();
}

function renumberRows() {
  document.querySelectorAll('#productBody tr').forEach((tr,i) => {
    tr.cells[0].textContent = i + 1;
  });
}

// ── GST mode / rate ────────────────────────────────────────
function onGstModeChange() {
  gstMode = document.querySelector('input[name="gstMode"]:checked').value;
  const rateRow = document.getElementById('gstRateRow');
  rateRow.style.display = gstMode === 'none' ? 'none' : 'block';

  const rowCGST = document.getElementById('row-cgst');
  const rowSGST = document.getElementById('row-sgst');
  const rowIGST = document.getElementById('row-igst');

  if (gstMode === 'cgst_sgst') {
    rowCGST.style.display = '';
    rowSGST.style.display = '';
    rowIGST.style.display = 'none';
  } else if (gstMode === 'igst') {
    rowCGST.style.display = 'none';
    rowSGST.style.display = 'none';
    rowIGST.style.display = '';
  } else {
    rowCGST.style.display = 'none';
    rowSGST.style.display = 'none';
    rowIGST.style.display = 'none';
  }
  recalc();
}

function selectGSTRate(rate, btn) {
  gstRate = rate;
  document.getElementById('gstRate').value = rate;
  document.getElementById('customGSTRate').value = '';
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  recalc();
}

function applyCustomRate(val) {
  gstRate = parseFloat(val) || 0;
  document.getElementById('gstRate').value = gstRate;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  recalc();
}

// ── Master recalculate ─────────────────────────────────────
function recalc() {
  // sum product amounts
  let subtotal = 0;
  document.querySelectorAll('#productBody tr').forEach(tr => {
    subtotal += parseFloat(tr.querySelector('.p-amount').value) || 0;
  });

  const loading  = parseFloat(document.getElementById('loadingCharges').value)  || 0;
  const freight  = parseFloat(document.getElementById('freightCharges').value)   || 0;
  const other    = parseFloat(document.getElementById('otherCharges').value)     || 0;
  const discount = parseFloat(document.getElementById('discount').value)         || 0;

  const taxable = subtotal + loading + freight + other - discount;

  let cgst = 0, sgst = 0, igst = 0;
  if (gstMode === 'cgst_sgst') {
    cgst = taxable * (gstRate / 2) / 100;
    sgst = taxable * (gstRate / 2) / 100;
  } else if (gstMode === 'igst') {
    igst = taxable * gstRate / 100;
  }

  const grandTotal = taxable + cgst + sgst + igst;
  const rounded    = Math.round(grandTotal);
  const roundOff   = rounded - grandTotal;

  // update summary labels
  const half = gstRate / 2;
  document.getElementById('label-cgst').textContent = `CGST (${half}%)`;
  document.getElementById('label-sgst').textContent = `SGST (${half}%)`;
  document.getElementById('label-igst').textContent = `IGST (${gstRate}%)`;

  // update summary values
  document.getElementById('s-taxable').textContent  = '₹ ' + fmt(taxable);
  document.getElementById('s-cgst').textContent     = '₹ ' + fmt(cgst);
  document.getElementById('s-sgst').textContent     = '₹ ' + fmt(sgst);
  document.getElementById('s-igst').textContent     = '₹ ' + fmt(igst);
  document.getElementById('s-total').textContent    = '₹ ' + fmt(grandTotal);
  document.getElementById('s-roundoff').textContent = '₹ ' + fmt(roundOff);
  document.getElementById('s-final').textContent    = '₹ ' + fmt(rounded);
}

function fmt(n) {
  return parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Amount in words ────────────────────────────────────────
function numToWords(num) {
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
             'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
             'Seventeen','Eighteen','Nineteen'];
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  function words(n) {
    if (n === 0) return '';
    if (n < 20)  return a[n] + ' ';
    if (n < 100) return b[Math.floor(n/10)] + ' ' + a[n%10] + ' ';
    return a[Math.floor(n/100)] + ' Hundred ' + words(n % 100);
  }

  num = Math.floor(num);
  if (num === 0) return 'Zero';

  let result = '';
  if (Math.floor(num / 10000000) > 0) { result += words(Math.floor(num/10000000)) + 'Crore '; num %= 10000000; }
  if (Math.floor(num / 100000)   > 0) { result += words(Math.floor(num/100000))   + 'Lakh ';  num %= 100000; }
  if (Math.floor(num / 1000)     > 0) { result += words(Math.floor(num/1000))     + 'Thousand '; num %= 1000; }
  result += words(num);
  return result.trim();
}

// ── Build invoice HTML ─────────────────────────────────────
function buildInvoiceHTML() {
  // collect values
  const sellerName    = v('sellerName');
  const sellerAddr    = v('sellerAddress');
  const sellerGST     = v('sellerGST');
  const sellerState   = v('sellerState');

  const buyerLabel    = v('buyerLabel') || 'Buyer (Bill to)';
  const buyerName     = v('buyerName');
  const buyerAddr     = v('buyerAddress');
  const buyerGST      = v('buyerGST');
  const buyerState    = v('buyerState');

  const consigneeName = v('consigneeName');
  const consigneeAddr = v('consigneeAddress');
  const consigneeGST  = v('consigneeGST');
  const consigneeState= v('consigneeState');

  const invNo     = v('invoiceNumber');
  const invDate   = fmtDate(v('invoiceDate'));
  const delivNote = v('deliveryNote');
  const payMode   = v('paymentMode');
  const suppRef   = v('supplierRef');
  const otherRef  = v('otherRef');
  const buyerOrd  = v('buyerOrderNo');
  const buyerOrdD = v('buyerOrderDate');
  const despDocNo = v('despatchDocNo');
  const delivNoteD= v('deliveryNoteDate');
  const despThru  = v('despatchThrough');
  const dest      = v('destination');
  const terms     = v('termsOfDelivery');
  const vehicleNo = v('vehicleNo');
  const ewayBill  = v('ewayBill');
  const contactNo = v('contactNumber');

  const bankName   = v('bankName');
  const accNo      = v('accountNumber');
  const ifsc       = v('ifscCode');
  const branch     = v('branchName');
  const decl       = v('declarationText');
  const authName   = v('authorisedName') || sellerName;

  // product rows
  const rows = document.querySelectorAll('#productBody tr');

  // calc totals
  let subtotal = 0;
  const prodData = [];
  rows.forEach((tr, i) => {
    const desc     = tr.querySelector('.p-desc').value;
    const hsn      = tr.querySelector('.p-hsn').value;
    const qty      = parseFloat(tr.querySelector('.p-qty').value) || 0;
    const unit     = tr.querySelector('.p-unit').value || '';
    const per      = tr.querySelector('.p-per').value  || unit;
    const rateIncl = parseFloat(tr.querySelector('.p-rate-incl').value) || 0;
    const rateExcl = parseFloat(tr.querySelector('.p-rate-excl').value) || 0;
    const amount   = parseFloat(tr.querySelector('.p-amount').value)    || 0;
    const vatPct   = parseFloat(tr.querySelector('.p-vat').value)       || 0;
    subtotal += amount;
    if (desc || qty) prodData.push({ no: i+1, desc, hsn, qty, unit, per, rateIncl, rateExcl, amount, vatPct });
  });

  const loading  = parseFloat(v2('loadingCharges'))  || 0;
  const freight  = parseFloat(v2('freightCharges'))   || 0;
  const other    = parseFloat(v2('otherCharges'))     || 0;
  const discount = parseFloat(v2('discount'))         || 0;

  const taxable = subtotal + loading + freight + other - discount;

  let cgst = 0, sgst = 0, igst = 0;
  if (gstMode === 'cgst_sgst') {
    cgst = taxable * (gstRate / 2) / 100;
    sgst = taxable * (gstRate / 2) / 100;
  } else if (gstMode === 'igst') {
    igst = taxable * gstRate / 100;
  }

  const grandTotal = taxable + cgst + sgst + igst;
  const rounded    = Math.round(grandTotal);
  const roundOff   = rounded - grandTotal;

  const totalQtyMap = {};
  prodData.forEach(p => {
    const key = p.unit || 'Nos';
    totalQtyMap[key] = (totalQtyMap[key] || 0) + p.qty;
  });
  const totalQtyStr = Object.entries(totalQtyMap).map(([u,q]) => `${fmt(q)} ${u}`).join(', ');

  const amountWords   = numToWords(rounded);
  const taxAmtWords   = numToWords(Math.round(cgst+sgst+igst));
  const half = gstRate / 2;

  // product table rows HTML
  let prodRowsHTML = prodData.map(p => `
    <tr>
      <td style="text-align:center">${p.no}</td>
      <td><strong>${p.desc}</strong></td>
      <td style="text-align:center">${p.hsn}</td>
      <td style="text-align:right">${p.qty ? fmt(p.qty)+' '+p.unit : ''}</td>
      <td style="text-align:right">${p.rateIncl ? fmt(p.rateIncl) : ''}</td>
      <td style="text-align:center">${p.per}</td>
      <td style="text-align:right">${p.rateExcl ? fmt(p.rateExcl) : ''}</td>
      <td style="text-align:right">${p.amount ? fmt(p.amount) : ''}</td>
      <td style="text-align:center">${p.vatPct ? p.vatPct+'%' : ''}</td>
    </tr>`).join('');

  // extra charge rows
  let extraHTML = '';
  if (loading > 0)  extraHTML += `<tr class="charge-row"><td colspan="7" style="text-align:right">LOADING CHARGES</td><td style="text-align:right">${fmt(loading)}</td><td></td></tr>`;
  if (freight > 0)  extraHTML += `<tr class="charge-row"><td colspan="7" style="text-align:right">FREIGHT</td><td style="text-align:right">${fmt(freight)}</td><td></td></tr>`;
  if (other   > 0)  extraHTML += `<tr class="charge-row"><td colspan="7" style="text-align:right">OTHER CHARGES</td><td style="text-align:right">${fmt(other)}</td><td></td></tr>`;
  if (discount > 0) extraHTML += `<tr class="charge-row"><td colspan="7" style="text-align:right">QUALITY ALLOWANCE / DISCOUNT</td><td style="text-align:right">(-) ${fmt(discount)}</td><td></td></tr>`;

  // GST breakdown for footer table
  let taxBreakHTML = '';
  if (gstMode === 'cgst_sgst' && gstRate > 0) {
    taxBreakHTML = `
      <tr><th>HSN/SAC</th><th>Taxable Value</th><th>CGST %</th><th>CGST Amt</th><th>SGST %</th><th>SGST Amt</th><th>Total Tax</th></tr>
      ${prodData.map(p => {
        const pTaxable = p.amount;
        const pCGST    = pTaxable * (half/100);
        const pSGST    = pTaxable * (half/100);
        return `<tr>
          <td>${p.hsn}</td>
          <td style="text-align:right">${fmt(pTaxable)}</td>
          <td style="text-align:center">${half}%</td>
          <td style="text-align:right">${fmt(pCGST)}</td>
          <td style="text-align:center">${half}%</td>
          <td style="text-align:right">${fmt(pSGST)}</td>
          <td style="text-align:right">${fmt(pCGST+pSGST)}</td>
        </tr>`;
      }).join('')}
      <tr style="font-weight:700;border-top:1px solid #000">
        <td>Total</td>
        <td style="text-align:right">${fmt(taxable)}</td>
        <td></td><td style="text-align:right">${fmt(cgst)}</td>
        <td></td><td style="text-align:right">${fmt(sgst)}</td>
        <td style="text-align:right">${fmt(cgst+sgst)}</td>
      </tr>`;
  } else if (gstMode === 'igst' && gstRate > 0) {
    taxBreakHTML = `
      <tr><th>HSN/SAC</th><th>Taxable Value</th><th>IGST %</th><th>IGST Amount</th><th>Total Tax</th></tr>
      ${prodData.map(p => {
        const pIGST = p.amount * (gstRate/100);
        return `<tr>
          <td>${p.hsn}</td>
          <td style="text-align:right">${fmt(p.amount)}</td>
          <td style="text-align:center">${gstRate}%</td>
          <td style="text-align:right">${fmt(pIGST)}</td>
          <td style="text-align:right">${fmt(pIGST)}</td>
        </tr>`;
      }).join('')}
      <tr style="font-weight:700;border-top:1px solid #000">
        <td>Total</td>
        <td style="text-align:right">${fmt(taxable)}</td>
        <td></td>
        <td style="text-align:right">${fmt(igst)}</td>
        <td style="text-align:right">${fmt(igst)}</td>
      </tr>`;
  }

  // consignee section
  const consigneeSection = consigneeName ? `
    <div style="font-size:10px;color:#555;margin-bottom:3px">Consignee (Ship to)</div>
    <div style="font-weight:700">${consigneeName}</div>
    <div style="font-size:10.5px;white-space:pre-wrap">${consigneeAddr}</div>
    ${consigneeGST   ? `<div>GSTIN/UIN : ${consigneeGST}</div>` : ''}
    ${consigneeState ? `<div>State Name : ${consigneeState}</div>` : ''}
    <hr style="margin:6px 0;border:none;border-top:1px solid #ccc">` : '';

  // logo & sig
  const logoHTML = logoB64 ? `<img src="${logoB64}" style="max-height:50px;max-width:130px;object-fit:contain;display:block;margin-bottom:6px">` : '';
  const sigHTML  = sigB64  ? `<img src="${sigB64}"  style="max-height:45px;max-width:130px;object-fit:contain;display:block;margin:6px 0 6px auto">` : '';

  return `
  <div id="invoiceOutput" style="font-family:Arial,sans-serif;font-size:11px;color:#000;line-height:1.35;background:#fff;padding:20px">

    ${logoHTML}
    <div class="inv-title">Tax Invoice</div>

    <div class="inv-outer">

      <!-- TOP: Seller | Invoice Meta -->
      <div class="inv-top-row">

        <!-- Seller -->
        <div class="inv-seller">
          <div class="co-name">${sellerName}</div>
          <div style="white-space:pre-wrap;font-size:10.5px">${sellerAddr}</div>
          ${sellerGST   ? `<div class="gst-line">GSTIN/UIN: ${sellerGST}</div>` : ''}
          ${sellerState ? `<div style="font-size:10.5px">State Name : ${sellerState}</div>` : ''}
        </div>

        <!-- Invoice Meta Grid -->
        <div class="inv-meta-grid">
          <div class="inv-meta-cell">
            <div class="inv-meta-label">Invoice No.</div>
            <div class="inv-meta-value">${invNo}</div>
          </div>
          <div class="inv-meta-cell right-col">
            <div class="inv-meta-label">Dated</div>
            <div class="inv-meta-value">${invDate}</div>
          </div>

          <div class="inv-meta-cell">
            <div class="inv-meta-label">Delivery Note</div>
            <div class="inv-meta-value">${delivNote}</div>
          </div>
          <div class="inv-meta-cell right-col">
            <div class="inv-meta-label">Mode/Terms of Payment</div>
            <div class="inv-meta-value">${payMode}</div>
          </div>

          <div class="inv-meta-cell">
            <div class="inv-meta-label">Supplier's Ref.</div>
            <div class="inv-meta-value">${suppRef}</div>
          </div>
          <div class="inv-meta-cell right-col">
            <div class="inv-meta-label">Other References</div>
            <div class="inv-meta-value">${otherRef}</div>
          </div>

          <div class="inv-meta-cell">
            <div class="inv-meta-label">Buyer's Order No.</div>
            <div class="inv-meta-value">${buyerOrd}</div>
          </div>
          <div class="inv-meta-cell right-col">
            <div class="inv-meta-label">Dated</div>
            <div class="inv-meta-value">${buyerOrdD}</div>
          </div>

          <div class="inv-meta-cell">
            <div class="inv-meta-label">Despatch Document No.</div>
            <div class="inv-meta-value">${despDocNo}</div>
          </div>
          <div class="inv-meta-cell right-col">
            <div class="inv-meta-label">Delivery Note Date</div>
            <div class="inv-meta-value">${delivNoteD}</div>
          </div>

          <div class="inv-meta-cell">
            <div class="inv-meta-label">Despatched through</div>
            <div class="inv-meta-value">${despThru}</div>
          </div>
          <div class="inv-meta-cell right-col">
            <div class="inv-meta-label">Destination</div>
            <div class="inv-meta-value">${dest}</div>
          </div>

          <div class="inv-meta-cell no-bottom" style="grid-column:1/-1">
            <div class="inv-meta-label">Terms of Delivery</div>
            <div class="inv-meta-value">${terms}</div>
          </div>
        </div>
      </div>

      <!-- BUYER ROW -->
      <div class="inv-buyer-row">
        <div class="inv-buyer">
          ${consigneeSection}
          <div class="b-label">${buyerLabel}</div>
          <div class="b-name">${buyerName}</div>
          <div style="white-space:pre-wrap;font-size:10.5px;margin-top:3px">${buyerAddr}</div>
          <div class="b-gst">
            ${buyerGST   ? `GSTIN/UIN : ${buyerGST}` : ''}
            ${buyerState ? `<br>State Name : ${buyerState}` : ''}
          </div>
        </div>
        <div style="padding:10px 12px;font-size:10.5px">
          ${contactNo  ? `<div><strong>Contact No.:</strong> ${contactNo}</div>` : ''}
          ${ewayBill   ? `<div><strong>E-Way Bill No.:</strong> ${ewayBill}</div>` : ''}
          ${vehicleNo  ? `<div><strong>Motor Vehicle No.:</strong> ${vehicleNo}</div>` : ''}
        </div>
      </div>

      <!-- PRODUCT TABLE -->
      <table class="inv-prod-table">
        <thead>
          <tr>
            <th style="width:32px;text-align:center">Sl<br>No.</th>
            <th>Description of Goods</th>
            <th style="width:80px;text-align:center">HSN/SAC</th>
            <th style="width:90px;text-align:right">Quantity</th>
            <th style="width:60px;text-align:right">Rate<br>(Incl.Tax)</th>
            <th style="width:45px;text-align:center">per</th>
            <th style="width:85px;text-align:right">Rate</th>
            <th style="width:90px;text-align:right">Amount</th>
            <th style="width:45px;text-align:center">VAT<br>%</th>
          </tr>
        </thead>
        <tbody>
          ${prodRowsHTML}
          <!-- spacer rows to fill page -->
          <tr style="height:18px"><td colspan="9"></td></tr>
          ${extraHTML}
          <tr class="charge-row">
            <td colspan="7" style="text-align:right;padding-right:8px">
              ${gstMode === 'cgst_sgst' && gstRate > 0 ? `CGST (${half}%)` : ''}
            </td>
            <td style="text-align:right">
              ${gstMode === 'cgst_sgst' && cgst > 0 ? fmt(cgst) : ''}
            </td>
            <td></td>
          </tr>
          <tr class="charge-row">
            <td colspan="7" style="text-align:right;padding-right:8px">
              ${gstMode === 'cgst_sgst' && gstRate > 0 ? `SGST (${half}%)` : ''}
              ${gstMode === 'igst'      && gstRate > 0 ? `IGST (${gstRate}%)` : ''}
            </td>
            <td style="text-align:right">
              ${gstMode === 'cgst_sgst' && sgst > 0 ? fmt(sgst) : ''}
              ${gstMode === 'igst'      && igst > 0 ? fmt(igst) : ''}
            </td>
            <td></td>
          </tr>
          ${roundOff !== 0 ? `
          <tr class="charge-row">
            <td colspan="7" style="text-align:right;padding-right:8px"><strong>Less: ROUND OFF</strong></td>
            <td style="text-align:right">(-)${fmt(Math.abs(roundOff))}</td>
            <td></td>
          </tr>` : ''}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="3" style="text-align:center">Total</td>
            <td style="text-align:right">${totalQtyStr}</td>
            <td colspan="3"></td>
            <td style="text-align:right">₹ ${fmt(rounded)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <!-- AMOUNT IN WORDS + TAX BREAKUP -->
      <div class="inv-totals-row">
        <div class="inv-words">
          <div class="w-label">Amount Chargeable (in words)</div>
          <div class="w-amount">INR ${amountWords} Only</div>
          <div style="margin-top:10px">
            <div class="w-label">Tax Amount (in words)</div>
            <div style="font-weight:600;font-size:10.5px">
              ${gstMode !== 'none' && gstRate > 0 ? 'INR ' + taxAmtWords + ' Only' : 'Nil'}
            </div>
          </div>
          <div style="text-align:right;margin-top:4px;font-size:9.5px;color:#555">E. &amp; O.E</div>
        </div>
        <div class="inv-tax-breakup">
          ${taxBreakHTML ? `<table class="inv-tax-table">${taxBreakHTML}</table>` : ''}
        </div>
      </div>

      <!-- BANK + DECLARATION + SIGNATURE -->
      <div class="inv-footer-row">
        <div class="inv-decl">
          ${bankName ? `
          <div style="margin-bottom:8px">
            <div class="d-label">BANK DETAILS</div>
            <div><strong>${bankName}</strong></div>
            ${accNo   ? `<div>A/C No. ${accNo}</div>`    : ''}
            ${ifsc    ? `<div>IFSC Code: ${ifsc}</div>`  : ''}
            ${branch  ? `<div>${branch}</div>`            : ''}
          </div>` : ''}
          <div class="d-label">Declaration</div>
          <div style="font-size:10px">${decl}</div>
        </div>
        <div class="inv-sig">
          <div class="sig-for">for ${authName}</div>
          ${sigHTML}
          <div><span class="sig-auth">Authorised Signatory</span></div>
        </div>
      </div>

      <div class="inv-computer">This is a Computer Generated Invoice</div>
    </div>
  </div>`;
}

// ── Helpers ────────────────────────────────────────────────
function v(id)  { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function v2(id) { const el = document.getElementById(id); return el ? el.value : '0'; }

// ── Preview ────────────────────────────────────────────────
function previewInvoice() {
  document.getElementById('invoiceOutput').innerHTML = buildInvoiceHTML();
  document.getElementById('previewModal').style.display = 'block';
}

function closeModal(e) {
  if (e.target.id === 'previewModal') {
    document.getElementById('previewModal').style.display = 'none';
  }
}

// ── PDF generation ─────────────────────────────────────────
function generatePDF() {
  if (!validateForm()) return;

  const invNo = v('invoiceNumber') || 'invoice';

  // Build a clean standalone div for pdf
  const wrapper = document.createElement('div');
  // ADDED: position: absolute and negative coordinates to prevent screen width constraints
  wrapper.style.cssText = 'position:absolute; top:-9999px; left:-9999px; background:#fff;padding:0;margin:0;width:794px;font-family:Arial,sans-serif;font-size:11px;color:#000;line-height:1.35;box-sizing:border-box;';
  wrapper.innerHTML = buildInvoiceHTML();
  document.body.appendChild(wrapper);

  const opt = {
    margin:      [8, 8, 8, 8],
    filename:    invNo + '.pdf',
    image:       { type: 'jpeg', quality: 0.98 },
    // ADDED: windowWidth: 800 to ensure the canvas renders the full width
    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: 800 },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf()
    .set(opt)
    .from(wrapper)
    .save()
    .then(() => {
      document.body.removeChild(wrapper);
    })
    .catch(err => {
      document.body.removeChild(wrapper);
      alert('PDF error: ' + err.message);
    });
}
// ── Print ──────────────────────────────────────────────────
function printInvoice() {
  if (!validateForm()) return;
  const html = buildInvoiceHTML();
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html><html><head>
    <title>Invoice</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;color:#000;margin:0;padding:16px}
      .inv-outer{border:1.5px solid #000}
      .inv-top-row,.inv-buyer-row,.inv-totals-row,.inv-footer-row{display:grid}
      .inv-top-row{grid-template-columns:40% 60%;border-bottom:1px solid #000}
      .inv-buyer-row{grid-template-columns:40% 60%;border-bottom:1px solid #000}
      .inv-totals-row{grid-template-columns:55% 45%;border-bottom:1px solid #000}
      .inv-footer-row{grid-template-columns:55% 45%}
      .inv-seller{padding:10px 12px;border-right:1px solid #000;font-size:11px}
      .inv-seller .co-name{font-weight:700;font-size:12px;margin-bottom:4px}
      .inv-seller .gst-line{margin-top:6px;font-weight:700}
      .inv-meta-grid{display:grid;grid-template-columns:1fr 1fr}
      .inv-meta-cell{padding:5px 8px;border-bottom:1px solid #000;font-size:10.5px}
      .inv-meta-cell.right-col{border-left:1px solid #000}
      .inv-meta-cell.no-bottom{border-bottom:none}
      .inv-meta-label{font-size:9.5px;color:#555;margin-bottom:1px}
      .inv-meta-value{font-weight:600}
      .inv-buyer{padding:10px 12px;border-right:1px solid #000;font-size:11px}
      .inv-buyer .b-label{font-size:10px;color:#444;margin-bottom:3px}
      .inv-buyer .b-name{font-weight:700;font-size:12px}
      .inv-buyer .b-gst{margin-top:3px;font-size:10.5px}
      .inv-terms{padding:6px 12px;border-bottom:1px solid #000;font-size:10.5px}
      .inv-prod-table{width:100%;border-collapse:collapse;border-bottom:1px solid #000}
      .inv-prod-table th{border-bottom:1px solid #000;border-right:1px solid #000;padding:6px 7px;text-align:left;font-size:10.5px;background:#f8f8f8}
      .inv-prod-table th:last-child{border-right:none}
      .inv-prod-table td{border-bottom:1px solid #ccc;border-right:1px solid #ccc;padding:5px 7px;font-size:10.5px;vertical-align:top}
      .inv-prod-table td:last-child{border-right:none}
      .inv-prod-table .charge-row td{border-bottom:none;font-size:10.5px}
      .inv-prod-table .total-row td{border-top:1.5px solid #000;border-bottom:1.5px solid #000;font-weight:700;font-size:11px}
      .inv-words{padding:8px 12px;font-size:10.5px;border-right:1px solid #000}
      .inv-words .w-label{font-size:9.5px;color:#555;margin-bottom:2px}
      .inv-words .w-amount{font-weight:700;font-size:11px}
      .inv-tax-breakup{padding:6px 8px;font-size:10.5px}
      .inv-tax-table{width:100%;border-collapse:collapse;font-size:10.5px}
      .inv-tax-table th{background:#f0f0f0;border:1px solid #ccc;padding:4px 6px;font-size:10px;text-align:left}
      .inv-tax-table td{border:1px solid #ccc;padding:4px 6px}
      .inv-decl{padding:10px 12px;font-size:10.5px;border-right:1px solid #000}
      .inv-decl .d-label{font-size:9.5px;color:#555;margin-bottom:3px;font-weight:600}
      .inv-sig{padding:10px 12px;text-align:right;font-size:10.5px}
      .inv-sig .sig-for{font-weight:700;margin-bottom:40px}
      .inv-sig .sig-auth{font-size:10px;color:#444;border-top:1px solid #000;padding-top:4px;display:inline-block}
      .inv-computer{text-align:center;padding:6px;font-size:10px;color:#555;border-top:1px solid #000}
      .inv-title{text-align:center;font-size:15px;font-weight:700;margin-bottom:0;letter-spacing:1px;padding-bottom:6px}
    </style>
  </head><body>${html}</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 600);
}

// ── Validate ───────────────────────────────────────────────
function validateForm() {
  const required = [
    ['sellerName',     'Seller Name'],
    ['buyerName',      'Buyer Name'],
    ['invoiceNumber',  'Invoice Number'],
    ['invoiceDate',    'Invoice Date'],
  ];
  for (const [id, label] of required) {
    if (!v(id)) {
      alert(`Please fill in: ${label}`);
      document.getElementById(id).focus();
      return false;
    }
  }
  // at least one product
  const rows = document.querySelectorAll('#productBody tr');
  let hasProduct = false;
  rows.forEach(tr => {
    if (tr.querySelector('.p-desc').value.trim() &&
        parseFloat(tr.querySelector('.p-qty').value) > 0) {
      hasProduct = true;
    }
  });
  if (!hasProduct) {
    alert('Please add at least one product with description and quantity.');
    return false;
  }
  return true;
}

// ── Save / History ─────────────────────────────────────────
function saveInvoice() {
  if (!validateForm()) return;
  recalc();

  const finalEl = document.getElementById('s-final');
  const finalAmt = finalEl ? finalEl.textContent : '0';

  const data = {
    id:          Date.now(),
    invNo:       v('invoiceNumber'),
    invDate:     v('invoiceDate'),
    buyerName:   v('buyerName'),
    finalAmount: finalAmt,
    formSnapshot: captureForm(),
    logoB64,
    sigB64,
    gstRate,
    gstMode
  };

  const all = getAll();
  // replace if same invoice number exists
  const idx = all.findIndex(x => x.invNo === data.invNo);
  if (idx >= 0) {
    if (!confirm(`Invoice ${data.invNo} already saved. Overwrite?`)) return;
    all[idx] = data;
  } else {
    all.push(data);
  }
  setAll(all);
  alert(`Invoice ${data.invNo} saved!`);
  renderHistory();
  updateDashboard();
}

function captureForm() {
  const ids = [
    'sellerName','sellerAddress','sellerGST','sellerState',
    'buyerLabel','buyerName','buyerAddress','buyerGST','buyerState',
    'consigneeName','consigneeAddress','consigneeGST','consigneeState',
    'invoiceNumber','invoiceDate','deliveryNote','paymentMode',
    'supplierRef','otherRef','buyerOrderNo','buyerOrderDate',
    'despatchDocNo','deliveryNoteDate','despatchThrough','destination',
    'termsOfDelivery','vehicleNo','ewayBill','contactNumber',
    'bankName','accountNumber','ifscCode','branchName',
    'declarationText','authorisedName',
    'loadingCharges','freightCharges','otherCharges','discount'
  ];
  const snap = {};
  ids.forEach(id => { const el = document.getElementById(id); if (el) snap[id] = el.value; });

  // capture products
  snap.products = [];
  document.querySelectorAll('#productBody tr').forEach(tr => {
    snap.products.push({
      desc:     tr.querySelector('.p-desc').value,
      hsn:      tr.querySelector('.p-hsn').value,
      qty:      tr.querySelector('.p-qty').value,
      unit:     tr.querySelector('.p-unit').value,
      per:      tr.querySelector('.p-per').value,
      rateIncl: tr.querySelector('.p-rate-incl').value,
      rateExcl: tr.querySelector('.p-rate-excl').value,
      amount:   tr.querySelector('.p-amount').value,
      vat:      tr.querySelector('.p-vat').value
    });
  });

  snap.gstMode = gstMode;
  snap.gstRate = gstRate;
  // gst radio
  const gstRadio = document.querySelector('input[name="gstMode"]:checked');
  snap.gstModeRadio = gstRadio ? gstRadio.value : 'cgst_sgst';
  return snap;
}

function restoreForm(snap) {
  Object.keys(snap).forEach(id => {
    if (id === 'products' || id === 'gstMode' || id === 'gstRate' || id === 'gstModeRadio') return;
    const el = document.getElementById(id);
    if (el) el.value = snap[id];
  });

  // products
  document.getElementById('productBody').innerHTML = '';
  (snap.products || []).forEach(p => {
    addProductRow();
    const tr = document.querySelector('#productBody tr:last-child');
    tr.querySelector('.p-desc').value     = p.desc;
    tr.querySelector('.p-hsn').value      = p.hsn;
    tr.querySelector('.p-qty').value      = p.qty;
    tr.querySelector('.p-unit').value     = p.unit;
    tr.querySelector('.p-per').value      = p.per;
    tr.querySelector('.p-rate-incl').value= p.rateIncl;
    tr.querySelector('.p-rate-excl').value= p.rateExcl;
    tr.querySelector('.p-amount').value   = p.amount;
    tr.querySelector('.p-vat').value      = p.vat;
  });

  // gst
  gstMode = snap.gstModeRadio || 'cgst_sgst';
  gstRate = parseFloat(snap.gstRate) || 0;
  const radio = document.querySelector(`input[name="gstMode"][value="${gstMode}"]`);
  if (radio) radio.checked = true;
  onGstModeChange();

  // chip
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  let matched = false;
  document.querySelectorAll('.chip').forEach(c => {
    if (c.textContent.trim() === gstRate + '%') { c.classList.add('active'); matched = true; }
  });
  if (!matched) {
    document.getElementById('customGSTRate').value = gstRate;
  }
  document.getElementById('gstRate').value = gstRate;
  recalc();
}

function renderHistory() {
  const all = getAll();
  const tbody = document.getElementById('historyBody');
  if (!all.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">No invoices saved yet.</td></tr>';
    return;
  }
  const q = (document.getElementById('searchBox') || {}).value || '';
  const filtered = q ? all.filter(x => x.invNo.toLowerCase().includes(q.toLowerCase()) ||
    x.buyerName.toLowerCase().includes(q.toLowerCase())) : all;

  tbody.innerHTML = filtered.map(inv => `
    <tr>
      <td><strong>${inv.invNo}</strong></td>
      <td>${fmtDate(inv.invDate)}</td>
      <td>${inv.buyerName}</td>
      <td><strong>${inv.finalAmount}</strong></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="loadInvoice(${inv.id})">✏ Edit</button>
        <button class="btn btn-danger  btn-sm" onclick="deleteInvoice(${inv.id})" style="margin-left:6px">🗑 Delete</button>
      </td>
    </tr>`).join('');
}

function filterHistory() { renderHistory(); }

function loadInvoice(id) {
  const inv = getAll().find(x => x.id === id);
  if (!inv) return;
  logoB64 = inv.logoB64 || '';
  sigB64  = inv.sigB64  || '';
  restoreForm(inv.formSnapshot || {});
  if (logoB64) document.getElementById('logoPreview').innerHTML = `<img src="${logoB64}">`;
  if (sigB64)  document.getElementById('sigPreview').innerHTML  = `<img src="${sigB64}">`;
  navigate('new-invoice', null);
}

function deleteInvoice(id) {
  if (!confirm('Delete this invoice?')) return;
  setAll(getAll().filter(x => x.id !== id));
  renderHistory();
  updateDashboard();
}

function getAll() { try { return JSON.parse(localStorage.getItem('gst_invoices') || '[]'); } catch(e){ return []; } }
function setAll(d) { localStorage.setItem('gst_invoices', JSON.stringify(d)); }

// ── Dashboard ──────────────────────────────────────────────
function updateDashboard() {
  const all = getAll();
  document.getElementById('dash-count').textContent = all.length;
  const recent = all[all.length - 1];
  document.getElementById('dash-recent').textContent = recent
    ? `${recent.invNo} — ${recent.buyerName}` : '—';
  // revenue: parse final amounts
  let total = 0;
  all.forEach(inv => {
    const n = parseFloat((inv.finalAmount || '').replace(/[₹,\s]/g,'')) || 0;
    total += n;
  });
  document.getElementById('dash-revenue').textContent = '₹ ' + fmt(total);
}

// ── Settings ───────────────────────────────────────────────
function saveSettings() {
  const s = {
    sellerName:    document.getElementById('def-sellerName').value,
    sellerGST:     document.getElementById('def-sellerGST').value,
    sellerAddress: document.getElementById('def-sellerAddress').value,
    sellerState:   document.getElementById('def-sellerState').value,
    bankName:      document.getElementById('def-bankName').value,
    accountNumber: document.getElementById('def-accountNumber').value,
    ifscCode:      document.getElementById('def-ifscCode').value,
    branchName:    document.getElementById('def-branchName').value,
  };
  localStorage.setItem('gst_settings', JSON.stringify(s));
  alert('Settings saved! They will auto-fill on the invoice form.');
  loadSettingsIntoForm();
}

function loadSettingsIntoForm() {
  let s;
  try { s = JSON.parse(localStorage.getItem('gst_settings') || '{}'); } catch(e){ s={}; }

  // populate settings page
  const map = {
    'def-sellerName':    s.sellerName,
    'def-sellerGST':     s.sellerGST,
    'def-sellerAddress': s.sellerAddress,
    'def-sellerState':   s.sellerState,
    'def-bankName':      s.bankName,
    'def-accountNumber': s.accountNumber,
    'def-ifscCode':      s.ifscCode,
    'def-branchName':    s.branchName,
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  });

  // auto-fill invoice form if blank
  const autoFill = {
    sellerName:    s.sellerName,
    sellerGST:     s.sellerGST,
    sellerAddress: s.sellerAddress,
    sellerState:   s.sellerState,
    bankName:      s.bankName,
    accountNumber: s.accountNumber,
    ifscCode:      s.ifscCode,
    branchName:    s.branchName,
  };
  Object.entries(autoFill).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val && !el.value) el.value = val;
  });

  // default images
  const dLogo = localStorage.getItem('defaultLogo');
  const dSig  = localStorage.getItem('defaultSig');
  if (dLogo) {
    if (!logoB64) logoB64 = dLogo;
    document.getElementById('def-logoPreview').innerHTML = `<img src="${dLogo}">`;
    if (!document.getElementById('logoPreview').innerHTML)
      document.getElementById('logoPreview').innerHTML = `<img src="${dLogo}">`;
  }
  if (dSig) {
    if (!sigB64) sigB64 = dSig;
    document.getElementById('def-sigPreview').innerHTML = `<img src="${dSig}">`;
    if (!document.getElementById('sigPreview').innerHTML)
      document.getElementById('sigPreview').innerHTML = `<img src="${dSig}">`;
  }
}

function saveDefaultImg(inputId, previewId, storageKey) {
  const file = document.getElementById(inputId).files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const b64 = e.target.result;
    localStorage.setItem(storageKey, b64);
    document.getElementById(previewId).innerHTML = `<img src="${b64}">`;
    if (storageKey === 'defaultLogo') logoB64 = b64;
    if (storageKey === 'defaultSig')  sigB64  = b64;
  };
  reader.readAsDataURL(file);
}

function clearAllData() {
  if (!confirm('This will DELETE all saved invoices and settings. Are you sure?')) return;
  localStorage.clear();
  logoB64 = ''; sigB64 = '';
  alert('All data cleared.');
  location.reload();
}

// ── Image upload preview ───────────────────────────────────
function previewImg(input, previewId) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const b64 = e.target.result;
    document.getElementById(previewId).innerHTML = `<img src="${b64}">`;
    if (input.id === 'logoFile') logoB64 = b64;
    if (input.id === 'sigFile')  sigB64  = b64;
  };
  reader.readAsDataURL(file);
}

// ── Clear form ─────────────────────────────────────────────
function clearForm() {
  if (!confirm('Clear all form data?')) return;
  document.querySelectorAll('#new-invoice input:not([type=radio]):not([type=file]), #new-invoice textarea, #new-invoice select')
    .forEach(el => {
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else if (el.type === 'number') el.value = '0';
      else el.value = '';
    });
  document.getElementById('productBody').innerHTML = '';
  addProductRow();
  logoB64 = ''; sigB64 = '';
  document.getElementById('logoPreview').innerHTML = '';
  document.getElementById('sigPreview').innerHTML  = '';
  gstRate = 0; gstMode = 'cgst_sgst';
  document.querySelector('input[name="gstMode"][value="cgst_sgst"]').checked = true;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  document.querySelector('.chip').classList.add('active'); // 0% chip
  document.getElementById('gstRate').value = 0;
  document.getElementById('customGSTRate').value = '';
  onGstModeChange();
  setToday();
  loadSettingsIntoForm();
  recalc();
}
