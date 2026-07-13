'use strict';

// ============================================================
// Prostalk Safaris — Contact Capture App
// Vanilla JS, no dependencies, fully offline
// ============================================================

const STORAGE_KEY = 'prostalk_session';

// --- State ---
let session = null; // { sessionName, createdDate, contacts: [] }
let editingContactId = null;
let confirmCallback = null;

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  bindLaunchScreen();
  bindAppScreen();
  bindForm();
  bindTabs();
  bindSearch();
  bindEditModal();
  bindConfirmModal();

  // Check for auto-saved session in localStorage
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.contacts) {
        showConfirm(
          'Unsaved Session Found',
          `There is an unsaved session "${parsed.sessionName}" with ${parsed.contacts.length} contact(s). Would you like to continue it?`,
          'Continue Session',
          () => {
            session = parsed;
            openAppScreen();
          }
        );
        return;
      }
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
});

// ============================================================
// LAUNCH SCREEN
// ============================================================
function bindLaunchScreen() {
  document.getElementById('btn-new-session').addEventListener('click', () => {
    openNewSessionModal();
  });

  document.getElementById('btn-open-session').addEventListener('click', () => {
    document.getElementById('file-open-input').click();
  });

  document.getElementById('file-open-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.sessionName || !Array.isArray(parsed.contacts)) {
          throw new Error('Invalid file format');
        }
        session = parsed;
        // Reset file input so same file can be re-opened
        e.target.value = '';
        openAppScreen();
        showToast(`Opened: ${session.sessionName} (${session.contacts.length} contacts)`, 'info');
      } catch (err) {
        showToast('Could not read file — please select a valid Prostalk session file.', 'warning');
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  });
}

// ============================================================
// NEW SESSION MODAL
// ============================================================
function openNewSessionModal() {
  const today = new Date();
  const defaultName = `Show — ${today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  const input = document.getElementById('input-session-name');
  input.value = defaultName;
  showModal('modal-new-session');
  setTimeout(() => { input.select(); }, 100);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-confirm-new-session').addEventListener('click', () => {
    const name = document.getElementById('input-session-name').value.trim();
    if (!name) {
      document.getElementById('input-session-name').focus();
      return;
    }
    session = {
      sessionName: name,
      createdDate: new Date().toISOString(),
      contacts: [],
    };
    hideModal('modal-new-session');
    autoSave();
    openAppScreen();
  });

  document.getElementById('btn-cancel-new-session').addEventListener('click', () => {
    hideModal('modal-new-session');
  });

  document.getElementById('input-session-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-confirm-new-session').click();
  });
});

// ============================================================
// APP SCREEN
// ============================================================
function openAppScreen() {
  showScreen('screen-app');
  updateHeaderStats();
  renderContactsList();
  switchTab('form');
}

function bindAppScreen() {
  document.getElementById('btn-home').addEventListener('click', () => {
    if (!session || session.contacts.length === 0) {
      session = null;
      localStorage.removeItem(STORAGE_KEY);
      showScreen('screen-launch');
      return;
    }
    showConfirm(
      'Leave Session?',
      'Any unsaved contacts will be kept in the browser until you save. Are you sure you want to go back to the start screen?',
      'Leave',
      () => {
        showScreen('screen-launch');
      }
    );
  });

  document.getElementById('btn-save').addEventListener('click', saveSessionToFile);
}

// ============================================================
// TABS
// ============================================================
function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => {
    const isActive = p.id === `tab-panel-${tab}`;
    p.classList.toggle('active', isActive);
    p.classList.remove('hidden'); // ensure !important override is never in play
  });
}

// ============================================================
// CONTACT FORM
// ============================================================
function bindForm() {
  const form = document.getElementById('contact-form');

  // Notes word counter
  const notesField = document.getElementById('field-notes');
  const notesCounter = document.getElementById('notes-counter');
  notesField.addEventListener('input', () => {
    const words = countWords(notesField.value);
    notesCounter.textContent = `${words} / ~100 words`;
    notesCounter.className = 'notes-counter' + (words > 120 ? ' red' : words > 90 ? ' amber' : '');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (validateForm()) {
      addContact();
    }
  });

  document.getElementById('btn-clear-form').addEventListener('click', () => {
    showConfirm('Clear Form?', 'This will reset all fields. The contact will NOT be saved.', 'Clear', () => {
      resetForm();
    });
  });
}

function validateForm() {
  const name = document.getElementById('field-name').value.trim();
  const phone = document.getElementById('field-phone').value.trim();
  const email = document.getElementById('field-email').value.trim();

  const errorDiv = document.getElementById('form-error');
  const phoneEmailError = document.getElementById('phone-email-error');
  const errors = [];

  // Reset
  errorDiv.classList.add('hidden');
  phoneEmailError.classList.add('hidden');
  document.getElementById('field-name').classList.remove('input-error');

  if (!name) {
    errors.push('Name is required.');
    document.getElementById('field-name').classList.add('input-error');
  }

  if (!phone && !email) {
    errors.push('Please enter at least a phone number or email address.');
    phoneEmailError.classList.remove('hidden');
  } else if (email && !looksLikeEmail(email)) {
    errors.push('The email address doesn\'t look right — please check it.');
  }

  if (errors.length > 0) {
    errorDiv.textContent = errors.join(' ');
    errorDiv.classList.remove('hidden');
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return false;
  }

  return true;
}

function addContact() {
  const contact = readFormValues();
  contact.id = generateId();
  contact.capturedAt = new Date().toISOString();
  session.contacts.push(contact);
  autoSave();
  updateHeaderStats();
  renderContactsList();
  resetForm();
  showToast(`Contact added — ${session.contacts.length} total`, 'success');
  // Scroll to top of form
  document.querySelector('.form-scroll').scrollTo({ top: 0, behavior: 'smooth' });
}

function readFormValues(prefix) {
  // prefix = '' for main form, or a per-id prefix for edit modal
  const p = prefix || '';
  const get = (id) => document.getElementById(p + id);
  const getVal = (id) => { const el = get(id); return el ? el.value.trim() : ''; };
  const getChecked = (name) => {
    const full = p ? `${p}-${name}` : name;
    return Array.from(document.querySelectorAll(`[name="${full}"]:checked`)).map(el => el.value);
  };
  const getRadio = (name) => {
    const full = p ? `${p}-${name}` : name;
    const el = document.querySelector(`[name="${full}"]:checked`);
    return el ? parseInt(el.value, 10) : null;
  };

  return {
    name: getVal('field-name'),
    phone: getVal('field-phone'),
    email: getVal('field-email'),
    address: getVal('field-address'),
    notes: getVal('field-notes'),
    africaPlainsGame: getChecked('africaPlainsGame'),
    africaTailoredSafari: getChecked('africaTailoredSafari'),
    africaBirdWildfowl: getChecked('africaBirdWildfowl'),
    africaDurationDays: getRadio('africaDuration'),
    europeSpecies: getChecked('europeSpecies'),
    europeDurationDays: getRadio('europeDuration'),
  };
}

function resetForm() {
  document.getElementById('contact-form').reset();
  document.getElementById('form-error').classList.add('hidden');
  document.getElementById('phone-email-error').classList.add('hidden');
  document.getElementById('notes-counter').textContent = '0 / ~100 words';
  document.getElementById('notes-counter').className = 'notes-counter';
}

// ============================================================
// CONTACTS LIST
// ============================================================
function bindSearch() {
  document.getElementById('contacts-search').addEventListener('input', (e) => {
    renderContactsList(e.target.value.toLowerCase());
  });
}

function renderContactsList(filter) {
  const list = document.getElementById('contacts-list');
  const empty = document.getElementById('contacts-empty');
  const badge = document.getElementById('tab-count-badge');

  if (!session || session.contacts.length === 0) {
    empty.classList.remove('hidden');
    list.innerHTML = '';
    list.appendChild(empty);
    badge.textContent = '0';
    return;
  }

  empty.classList.add('hidden');
  badge.textContent = session.contacts.length;

  const contacts = filter
    ? session.contacts.filter(c =>
        (c.name || '').toLowerCase().includes(filter) ||
        (c.email || '').toLowerCase().includes(filter) ||
        (c.phone || '').toLowerCase().includes(filter)
      )
    : session.contacts;

  // Build from scratch
  const fragment = document.createDocumentFragment();
  fragment.appendChild(empty); // keep in DOM but hidden

  if (contacts.length === 0) {
    const noMatch = document.createElement('div');
    noMatch.className = 'contacts-empty';
    noMatch.textContent = 'No contacts match your search.';
    fragment.appendChild(noMatch);
  } else {
    contacts.slice().reverse().forEach((contact, idx) => {
      const card = buildContactCard(contact, session.contacts.length - idx);
      fragment.appendChild(card);
    });
  }

  list.innerHTML = '';
  list.appendChild(fragment);
}

function buildContactCard(contact, number) {
  const card = document.createElement('div');
  card.className = 'contact-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');

  const index = document.createElement('div');
  index.className = 'contact-card-index';
  index.textContent = `#${number}`;

  const body = document.createElement('div');
  body.className = 'contact-card-body';

  const name = document.createElement('div');
  name.className = 'contact-card-name';
  name.textContent = contact.name || '(no name)';

  const sub = document.createElement('div');
  sub.className = 'contact-card-sub';
  const subParts = [];
  if (contact.phone) subParts.push(contact.phone);
  if (contact.email) subParts.push(contact.email);
  sub.textContent = subParts.join(' · ') || 'No contact details';

  const tags = document.createElement('div');
  tags.className = 'contact-card-interests';

  const africaSpecies = [
    ...(contact.africaPlainsGame || []),
    ...(contact.africaTailoredSafari || []),
    ...(contact.africaBirdWildfowl || []),
  ];
  if (africaSpecies.length > 0) {
    const tag = document.createElement('span');
    tag.className = 'interest-tag interest-tag-africa';
    tag.textContent = `Africa: ${africaSpecies.slice(0, 3).join(', ')}${africaSpecies.length > 3 ? '…' : ''}`;
    tags.appendChild(tag);
  }
  if (contact.africaDurationDays) {
    const tag = document.createElement('span');
    tag.className = 'interest-tag interest-tag-africa';
    tag.textContent = `${contact.africaDurationDays} days`;
    tags.appendChild(tag);
  }
  if ((contact.europeSpecies || []).length > 0) {
    const tag = document.createElement('span');
    tag.className = 'interest-tag interest-tag-europe';
    tag.textContent = `Europe: ${contact.europeSpecies.join(', ')}`;
    tags.appendChild(tag);
  }
  if (contact.europeDurationDays) {
    const tag = document.createElement('span');
    tag.className = 'interest-tag interest-tag-europe';
    tag.textContent = `${contact.europeDurationDays} days`;
    tags.appendChild(tag);
  }
  if (contact.notes) {
    const tag = document.createElement('span');
    tag.className = 'interest-tag';
    tag.style.cssText = 'background:#f0f0f0;color:#555;';
    tag.textContent = '📝 Notes';
    tags.appendChild(tag);
  }

  body.appendChild(name);
  body.appendChild(sub);
  if (tags.children.length > 0) body.appendChild(tags);

  card.appendChild(index);
  card.appendChild(body);

  const open = () => openEditModal(contact.id);
  card.addEventListener('click', open);
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') open(); });

  return card;
}

// ============================================================
// EDIT CONTACT MODAL
// ============================================================
function bindEditModal() {
  document.getElementById('btn-cancel-edit').addEventListener('click', () => {
    hideModal('modal-edit-contact');
    editingContactId = null;
  });

  document.getElementById('btn-save-edit').addEventListener('click', () => {
    saveEditedContact();
  });

  document.getElementById('btn-delete-contact').addEventListener('click', () => {
    showConfirm(
      'Delete Contact?',
      `This will permanently remove this contact from the session.`,
      'Delete',
      () => {
        deleteContact(editingContactId);
        hideModal('modal-edit-contact');
        editingContactId = null;
      }
    );
  });
}

function openEditModal(contactId) {
  const contact = session.contacts.find(c => c.id === contactId);
  if (!contact) return;
  editingContactId = contactId;

  const container = document.getElementById('edit-form-container');
  container.innerHTML = buildEditForm(contact);
  showModal('modal-edit-contact');
}

function buildEditForm(contact) {
  const africaPlains = ['Springbuck', 'Impala', 'Kudu', 'Blesbuck', 'Eland'];
  const africaTailored = ['Buffalo', 'Sable', 'Crocodile', 'Waterbuck'];
  const africaBird = ['Duck', 'Geese', 'Dove', 'Pigeon'];
  const europeSpeciesList = ['Wild Boar', 'Bear', 'Deer'];

  const chk = (name, values, checked) =>
    values.map(v => `
      <label class="checkbox-item">
        <input type="checkbox" name="edit-${name}" value="${v}" ${(checked || []).includes(v) ? 'checked' : ''} />
        <span class="checkbox-label">${v}</span>
      </label>`).join('');

  const radio = (name, values, checked) =>
    values.map(v => `
      <label class="duration-item">
        <input type="radio" name="edit-${name}" value="${v}" ${checked == v ? 'checked' : ''} />
        <span class="duration-label">${v}</span>
      </label>`).join('');

  const words = countWords(contact.notes || '');
  const counterClass = words > 120 ? 'red' : words > 90 ? 'amber' : '';

  return `
    <div class="form-section">
      <h3 class="section-heading">Contact Details</h3>
      <div class="form-group">
        <label class="form-label required">Name</label>
        <input type="text" id="edit-field-name" class="form-input" value="${esc(contact.name)}" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Telephone</label>
          <input type="tel" id="edit-field-phone" class="form-input" value="${esc(contact.phone)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" id="edit-field-email" class="form-input" value="${esc(contact.email)}" />
        </div>
      </div>
      <div id="edit-phone-email-error" class="field-error hidden">Please enter at least a phone number or email address.</div>
      <div class="form-group">
        <label class="form-label">Address</label>
        <textarea id="edit-field-address" class="form-input form-textarea" rows="3">${esc(contact.address)}</textarea>
      </div>
    </div>

    <div class="form-section section-africa">
      <h3 class="section-heading section-heading-africa">Africa — Interest</h3>
      <div class="interest-group">
        <h4 class="interest-subheading">Plains Game</h4>
        <div class="checkbox-grid">${chk('africaPlainsGame', africaPlains, contact.africaPlainsGame)}</div>
      </div>
      <div class="interest-group">
        <h4 class="interest-subheading">Safari Tailored for You</h4>
        <div class="checkbox-grid">${chk('africaTailoredSafari', africaTailored, contact.africaTailoredSafari)}</div>
      </div>
      <div class="interest-group">
        <h4 class="interest-subheading">Safari for Bird &amp; Wildfowl</h4>
        <div class="checkbox-grid">${chk('africaBirdWildfowl', africaBird, contact.africaBirdWildfowl)}</div>
      </div>
      <div class="interest-group">
        <h4 class="interest-subheading">Duration</h4>
        <div class="duration-selector">${radio('africaDuration', [5,6,7,8,9,10], contact.africaDurationDays)}</div>
        <p class="duration-hint">days</p>
      </div>
    </div>

    <div class="form-section section-europe">
      <h3 class="section-heading section-heading-europe">Europe — Interest</h3>
      <div class="interest-group">
        <h4 class="interest-subheading">Species</h4>
        <div class="checkbox-grid">${chk('europeSpecies', europeSpeciesList, contact.europeSpecies)}</div>
      </div>
      <div class="interest-group">
        <h4 class="interest-subheading">Duration</h4>
        <div class="duration-selector">${radio('europeDuration', [3,4,5], contact.europeDurationDays)}</div>
        <p class="duration-hint">days</p>
      </div>
    </div>

    <div class="form-section">
      <h3 class="section-heading">Notes</h3>
      <div class="form-group">
        <label class="form-label">
          Additional notes
          <span class="notes-counter ${counterClass}" id="edit-notes-counter">${words} / ~100 words</span>
        </label>
        <textarea id="edit-field-notes" class="form-input form-textarea form-textarea-notes" rows="5">${esc(contact.notes)}</textarea>
      </div>
    </div>
  `;
}

// Bind notes counter for edit modal (delegated)
document.addEventListener('input', (e) => {
  if (e.target.id === 'edit-field-notes') {
    const words = countWords(e.target.value);
    const counter = document.getElementById('edit-notes-counter');
    if (counter) {
      counter.textContent = `${words} / ~100 words`;
      counter.className = 'notes-counter' + (words > 120 ? ' red' : words > 90 ? ' amber' : '');
    }
  }
});

function saveEditedContact() {
  const contact = session.contacts.find(c => c.id === editingContactId);
  if (!contact) return;

  const name = document.getElementById('edit-field-name').value.trim();
  const phone = document.getElementById('edit-field-phone').value.trim();
  const email = document.getElementById('edit-field-email').value.trim();
  const phoneEmailErr = document.getElementById('edit-phone-email-error');
  phoneEmailErr.classList.add('hidden');

  if (!name) {
    document.getElementById('edit-field-name').focus();
    showToast('Name is required.', 'warning');
    return;
  }
  if (!phone && !email) {
    phoneEmailErr.classList.remove('hidden');
    showToast('Please enter at least a phone number or email.', 'warning');
    return;
  }

  const getEditChecked = (name) =>
    Array.from(document.querySelectorAll(`[name="edit-${name}"]:checked`)).map(el => el.value);
  const getEditRadio = (name) => {
    const el = document.querySelector(`[name="edit-${name}"]:checked`);
    return el ? parseInt(el.value, 10) : null;
  };

  contact.name = name;
  contact.phone = phone;
  contact.email = email;
  contact.address = document.getElementById('edit-field-address').value.trim();
  contact.notes = document.getElementById('edit-field-notes').value.trim();
  contact.africaPlainsGame = getEditChecked('africaPlainsGame');
  contact.africaTailoredSafari = getEditChecked('africaTailoredSafari');
  contact.africaBirdWildfowl = getEditChecked('africaBirdWildfowl');
  contact.africaDurationDays = getEditRadio('africaDuration');
  contact.europeSpecies = getEditChecked('europeSpecies');
  contact.europeDurationDays = getEditRadio('europeDuration');
  contact.updatedAt = new Date().toISOString();

  autoSave();
  renderContactsList(document.getElementById('contacts-search').value.toLowerCase() || undefined);
  hideModal('modal-edit-contact');
  editingContactId = null;
  showToast('Contact updated', 'success');
}

function deleteContact(id) {
  session.contacts = session.contacts.filter(c => c.id !== id);
  autoSave();
  updateHeaderStats();
  renderContactsList(document.getElementById('contacts-search').value.toLowerCase() || undefined);
  showToast('Contact deleted', 'info');
}

// ============================================================
// SAVE SESSION TO FILE
// ============================================================
async function saveSessionToFile() {
  if (!session) return;

  const safeName = session.sessionName.replace(/[^a-z0-9_\-\s]/gi, '').replace(/\s+/g, '_');
  const ts = new Date().toISOString().slice(0, 10);
  const fileName = `Prostalk_${safeName}_${ts}.json`;
  const json = JSON.stringify(session, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  // Chrome/Edge on Mac support the File System Access API — gives a proper "Save As" folder picker
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'Prostalk Session', accept: { 'application/json': ['.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      showToast('Session saved ✓', 'success');
      return;
    } catch (err) {
      // User cancelled the picker — do nothing
      if (err.name === 'AbortError') return;
      // Any other error — fall through to Safari method
    }
  }

  // iPad / iPhone / modern Safari: use the native Share Sheet (offers "Save to Files")
  const file = new File([blob], fileName, { type: 'application/json' });
  if (navigator.share) {
    try {
      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        throw new Error('Sharing files not supported');
      }
      await navigator.share({
        files: [file],
        title: 'Prostalk Session',
        text: fileName,
      });
      showToast('Session saved ✓', 'success');
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
      // Fall through to legacy download
    }
  }

  // Legacy Safari fallback: trigger a download via an in-DOM anchor
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  // Show instructions modal after a short delay so the download sheet has appeared
  setTimeout(() => showSaveInstructions(fileName), 400);

  // Give Safari a moment to start the download before removing the anchor and revoking the blob
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

function showSaveInstructions(fileName) {
  const isMac = /Macintosh|MacIntel/.test(navigator.userAgent) && !('ontouchstart' in window);

  document.getElementById('confirm-title').textContent = '💾 Where is my file?';

  const macExtra = isMac
    ? `<br><a href="#" id="open-icloud-link" style="color:#1F4E5F;font-weight:600;">
        📂 Open iCloud Drive in Finder
       </a> — then drag the file in from Downloads.`
    : '';

  document.getElementById('confirm-message').innerHTML = isMac
    ? `<strong>${esc(fileName)}</strong> has been saved to your <strong>Downloads</strong> folder.<br><br>` +
      `To keep it backed up on iCloud Drive:<br>` +
      `Open Finder → <strong>iCloud Drive</strong> → drag the file in. ` +
      `You can create a new folder there with <strong>Cmd+Shift+N</strong>.` +
      macExtra
    : `Tap <strong>"Save to Files"</strong> in the sheet that just appeared.<br><br>` +
      `Then choose <strong>iCloud Drive</strong>. ` +
      `To create a new folder, tap the <strong>New Folder</strong> icon in the top-right corner, ` +
      `give it a name (e.g. <em>Prostalk Safaris</em>), then tap <strong>Save</strong>.`;
  document.getElementById('btn-confirm-cancel').classList.add('hidden');
  document.getElementById('btn-confirm-ok').textContent = 'Got it';
  document.getElementById('btn-confirm-ok').className = 'btn btn-primary';
  confirmCallback = () => {
    document.getElementById('btn-confirm-cancel').classList.remove('hidden');
    document.getElementById('btn-confirm-ok').className = 'btn btn-danger';
  };
  showModal('modal-confirm');

  // Wire up the "Open iCloud Drive in Finder" link if present (Mac only)
  setTimeout(() => {
    const link = document.getElementById('open-icloud-link');
    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        // Opens iCloud Drive folder in Finder via the well-known path
        window.location.href = 'file://' + encodeURI(
          (navigator.userAgent.includes('Safari') ? '' : '') +
          `/Users/${getSystemUsername()}/Library/Mobile Documents/com~apple~CloudDocs/`
        );
      });
    }
  }, 100);
}

// Best-effort: extract macOS username from the file:// URL the app was opened from
function getSystemUsername() {
  try {
    const url = window.location.href;
    const match = url.match(/^file:\/\/\/Users\/([^/]+)\//);
    return match ? match[1] : '';
  } catch (e) { return ''; }
}

// ============================================================
// AUTO-SAVE TO LOCALSTORAGE
// ============================================================
function autoSave() {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
}

// ============================================================
// HEADER STATS
// ============================================================
function updateHeaderStats() {
  const count = session ? session.contacts.length : 0;
  document.getElementById('header-contact-count').textContent = count;
  document.getElementById('header-session-name').textContent = session ? session.sessionName : '';
  document.getElementById('tab-count-badge').textContent = count;
}

// ============================================================
// CONFIRM MODAL
// ============================================================
function bindConfirmModal() {
  document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
    hideModal('modal-confirm');
    confirmCallback = null;
  });
  document.getElementById('btn-confirm-ok').addEventListener('click', () => {
    hideModal('modal-confirm');
    if (confirmCallback) { confirmCallback(); confirmCallback = null; }
  });
}

function showConfirm(title, message, okLabel, callback) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('btn-confirm-ok').textContent = okLabel || 'Confirm';
  document.getElementById('btn-confirm-ok').className = 'btn btn-danger';
  document.getElementById('btn-confirm-cancel').classList.remove('hidden');
  confirmCallback = callback;
  showModal('modal-confirm');
}

// ============================================================
// MODAL HELPERS
// ============================================================
function showModal(id) { document.getElementById(id).classList.remove('hidden'); }
function hideModal(id) { document.getElementById(id).classList.add('hidden'); }

// Close modals on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
    editingContactId = null;
    confirmCallback = null;
  }
});

// ============================================================
// SCREEN HELPER
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.toggle('active', s.id === id);
    s.classList.toggle('hidden', s.id !== id);
  });
}

// ============================================================
// TOAST
// ============================================================
let toastTimer = null;
function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type || ''}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ============================================================
// UTILITIES
// ============================================================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function looksLikeEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

function countWords(text) {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

// Escape HTML for use in innerHTML
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
