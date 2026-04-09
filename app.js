(function () {
  'use strict';

  const form = document.getElementById('invoice-form');
  const invoiceSection = document.getElementById('invoice-section');
  const invoicePaper = document.getElementById('invoice-paper');
  const lineItemsTbody = document.getElementById('line-items-tbody');
  const invoiceItemsTbody = document.getElementById('invoice-items-tbody');
  const MAX_LINES = 10;

  function get(id) {
    return document.getElementById(id);
  }

  function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  }

  function formatMoney(value, currency) {
    if (value === '' || value === null || value === undefined) return '';
    const n = Number(value);
    if (isNaN(n)) return String(value);
    const formatted = n.toFixed(2);
    return currency ? formatted + ' ' + currency : formatted;
  }

  function getLineRows() {
    return Array.from(lineItemsTbody.querySelectorAll('.line-item-row'));
  }

  function updateLineAmount(row) {
    const qty = parseFloat(row.querySelector('input[name="lineQty"]').value) || 0;
    const rate = parseFloat(row.querySelector('input[name="lineRate"]').value) || 0;
    row.querySelector('input[name="lineAmount"]').value = (qty * rate).toFixed(2);
  }

  function updateAllLineAmounts() {
    getLineRows().forEach(updateLineAmount);
  }

  function updateSubtotalFromLines() {
    let sum = 0;
    getLineRows().forEach(function (row) {
      sum += parseFloat(row.querySelector('input[name="lineAmount"]').value) || 0;
    });
    get('subtotal').value = sum.toFixed(2);
    updateTaxAmount();
    updateBalanceDue();
  }

  function updateNights() {
    const checkIn = get('checkIn').value;
    const checkOut = get('checkOut').value;
    const nightsEl = get('nights');
    if (!checkIn || !checkOut) {
      nightsEl.value = '';
      return;
    }
    const a = new Date(checkIn);
    const b = new Date(checkOut);
    if (isNaN(a.getTime()) || isNaN(b.getTime()) || b <= a) {
      nightsEl.value = '';
      return;
    }
    const nights = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
    nightsEl.value = nights;
  }

  function updateBalanceDue() {
    const total = parseFloat(get('totalAmount').value) || 0;
    const paid = parseFloat(get('amountPaid').value) || 0;
    const balance = Math.max(0, total - paid);
    get('balanceDue').value = balance.toFixed(2);
  }

  function updateTaxAmount() {
    const subtotal = parseFloat(get('subtotal').value) || 0;
    const rate = parseFloat(get('taxRate').value) || 0;
    const tax = (subtotal * rate / 100);
    get('taxAmount').value = tax.toFixed(2);
    get('totalAmount').value = (subtotal + tax).toFixed(2);
    updateBalanceDue();
  }

  function addLineItem() {
    const rows = getLineRows();
    if (rows.length >= MAX_LINES) return;
    const firstRow = rows[0];
    const newRow = firstRow.cloneNode(true);
    newRow.setAttribute('data-row', rows.length + 1);
    newRow.querySelector('input[name="lineDetails"]').value = '';
    newRow.querySelector('input[name="lineQty"]').value = '1';
    newRow.querySelector('input[name="lineRate"]').value = '0';
    newRow.querySelector('input[name="lineAmount"]').value = '0.00';
    lineItemsTbody.appendChild(newRow);
    bindLineRow(newRow);
    if (rows.length === 0) get('btn-add-line').style.display = '';
  }

  function removeLineItem(row) {
    const rows = getLineRows();
    if (rows.length <= 1) return;
    row.remove();
    updateSubtotalFromLines();
  }

  function bindLineRow(row) {
    const qtyInput = row.querySelector('input[name="lineQty"]');
    const rateInput = row.querySelector('input[name="lineRate"]');
    const removeBtn = row.querySelector('.btn-remove-line');
    function onInput() {
      updateLineAmount(row);
      updateSubtotalFromLines();
    }
    qtyInput.addEventListener('input', onInput);
    rateInput.addEventListener('input', onInput);
    if (removeBtn) removeBtn.addEventListener('click', function () { removeLineItem(row); });
  }

  function fillInvoice() {
    invoiceSection.setAttribute('aria-hidden', 'false');
    const currency = get('currency').value || 'USD';

    const out = (id, value, formatter, extra) => {
      const el = get('out-' + id);
      if (!el) return;
      el.textContent = value != null && value !== '' ? (formatter ? formatter(value, extra) : value) : '—';
    };

    function outLine(id, value, formatter, extra) {
      const el = get('out-' + id);
      if (!el) return;
      const hasValue = value != null && value !== '';
      el.style.display = hasValue ? '' : 'none';
      el.textContent = hasValue ? (formatter ? formatter(value, extra) : value) : '';
    }

    out('businessName', get('businessName').value);
    outLine('address', get('address').value);
    outLine('addressLine2', get('addressLine2').value);
    outLine('phoneEmail', get('phoneEmail').value);
    outLine('guestName', get('guestName').value);
    outLine('guestAddress1', get('guestAddress1').value);
    outLine('guestAddress2', get('guestAddress2').value);
    outLine('guestContact', get('guestContact').value);
    out('invoiceNumber', get('invoiceNumber').value);
    out('invoiceDate', get('invoiceDate').value, formatDate);
    out('reservationNumber', get('reservationNumber').value);
    out('checkIn', get('checkIn').value, formatDate);
    out('checkOut', get('checkOut').value, formatDate);
    out('nights', get('nights').value);
    out('currency', currency);
    out('paymentTerms', get('paymentTerms').value);
    out('notesTerms', get('notesTerms').value || 'Thank you for your business.');

    const rows = getLineRows();
    invoiceItemsTbody.innerHTML = '';
    rows.forEach(function (row) {
      const details = row.querySelector('input[name="lineDetails"]').value;
      const qty = row.querySelector('input[name="lineQty"]').value;
      const rate = row.querySelector('input[name="lineRate"]').value;
      const amount = row.querySelector('input[name="lineAmount"]').value;
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + (details || '—') + '</td>' +
        '<td>' + (qty !== '' ? qty : '—') + '</td>' +
        '<td>' + (rate !== '' ? formatMoney(rate, null) : '—') + '</td>' +
        '<td>' + (amount !== '' ? formatMoney(amount, currency) : '—') + '</td>';
      invoiceItemsTbody.appendChild(tr);
    });
    if (rows.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="4">—</td>';
      invoiceItemsTbody.appendChild(tr);
    }

    out('subtotal', get('subtotal').value, formatMoney, currency);
    out('taxAmount', get('taxAmount').value, formatMoney, currency);
    out('totalAmount', get('totalAmount').value, formatMoney, currency);
    out('amountPaid', get('amountPaid').value, formatMoney, currency);
    out('balanceDue', get('balanceDue').value, formatMoney, currency);
    // Payment method – show only the relevant block
    const method = get('paymentMethod').value;
    out('paymentMethod', method || '—');

    var cashBlock = get('out-cash-block');
    var mpesaBlock = get('out-mpesa-block');
    var bankBlock = get('out-bank-block');
    var cardBlock = get('out-card-block');
    cashBlock.style.display = 'none';
    mpesaBlock.style.display = 'none';
    bankBlock.style.display = 'none';
    cardBlock.style.display = 'none';

    if (method === 'Cash') {
      cashBlock.style.display = '';
    } else if (method === 'M-Pesa') {
      mpesaBlock.style.display = '';
      out('mpesaName', get('mpesaName').value);
      var mpesaType = get('mpesaType').value;
      get('out-mpesa-phone-block').style.display = 'none';
      get('out-mpesa-till-block').style.display = 'none';
      get('out-mpesa-paybill-block').style.display = 'none';
      if (mpesaType === 'Phone') {
        get('out-mpesa-phone-block').style.display = '';
        out('mpesaPhone', get('mpesaPhone').value);
      } else if (mpesaType === 'Till') {
        get('out-mpesa-till-block').style.display = '';
        out('mpesaTill', get('mpesaTill').value);
      } else if (mpesaType === 'Paybill') {
        get('out-mpesa-paybill-block').style.display = '';
        out('mpesaPaybill', get('mpesaPaybill').value);
        out('mpesaAccountNo', get('mpesaAccountNo').value);
      }
    } else if (method === 'Bank Transfer') {
      bankBlock.style.display = '';
      out('bankName', get('bankName').value);
      out('bankCode', get('bankCode').value);
      out('branchName', get('branchName').value);
      out('branchCode', get('branchCode').value);
      out('accountName', get('accountName').value);
      out('accountNumber', get('accountNumber').value);
      out('swiftIban', get('swiftIban').value);
    } else if (method === 'Card') {
      cardBlock.style.display = '';
      out('cardInstructions', get('cardInstructions').value);
    }
  }

  // Clear all inputs inside a container
  function clearFields(container) {
    container.querySelectorAll('input, select').forEach(function (el) {
      if (el.tagName === 'SELECT') {
        el.selectedIndex = 0;
      } else {
        el.value = '';
      }
    });
  }

  // Payment method field toggling — clear inactive sections
  function togglePaymentFields() {
    var method = get('paymentMethod').value;

    if (method !== 'M-Pesa') clearFields(get('mpesa-fields'));
    if (method !== 'Bank Transfer') clearFields(get('bank-fields'));
    if (method !== 'Card') clearFields(get('card-fields'));

    get('mpesa-fields').style.display = method === 'M-Pesa' ? '' : 'none';
    get('bank-fields').style.display = method === 'Bank Transfer' ? '' : 'none';
    get('card-fields').style.display = method === 'Card' ? '' : 'none';

    // If leaving M-Pesa, also reset sub-type visibility
    if (method !== 'M-Pesa') toggleMpesaType();
  }

  function toggleMpesaType() {
    var mpesaType = get('mpesaType').value;

    if (mpesaType !== 'Phone') clearFields(get('mpesa-phone-fields'));
    if (mpesaType !== 'Till') clearFields(get('mpesa-till-fields'));
    if (mpesaType !== 'Paybill') clearFields(get('mpesa-paybill-fields'));

    get('mpesa-phone-fields').style.display = mpesaType === 'Phone' ? '' : 'none';
    get('mpesa-till-fields').style.display = mpesaType === 'Till' ? '' : 'none';
    get('mpesa-paybill-fields').style.display = mpesaType === 'Paybill' ? '' : 'none';
  }

  get('paymentMethod').addEventListener('change', togglePaymentFields);
  get('mpesaType').addEventListener('change', toggleMpesaType);
  togglePaymentFields();
  toggleMpesaType();

  // Bind initial line row
  getLineRows().forEach(bindLineRow);

  get('btn-add-line').addEventListener('click', addLineItem);
  get('checkIn').addEventListener('change', updateNights);
  get('checkOut').addEventListener('change', updateNights);
  get('taxRate').addEventListener('input', updateTaxAmount);
  get('amountPaid').addEventListener('input', updateBalanceDue);

  get('btn-preview').addEventListener('click', function () {
    updateNights();
    updateAllLineAmounts();
    updateSubtotalFromLines();
    updateTaxAmount();
    updateBalanceDue();
    fillInvoice();
    invoicePaper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  get('btn-print').addEventListener('click', function () {
    updateNights();
    updateAllLineAmounts();
    updateSubtotalFromLines();
    updateTaxAmount();
    updateBalanceDue();
    fillInvoice();
    window.print();
  });

  // Auto-fill date and generate unique invoice number
  var now = new Date();
  if (!get('invoiceDate').value) get('invoiceDate').value = now.toISOString().slice(0, 10);

  function generateInvoiceNumber() {
    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return 'INV-' +
      d.getFullYear() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) + '-' +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds());
  }

  if (!get('invoiceNumber').value) get('invoiceNumber').value = generateInvoiceNumber();
})();
