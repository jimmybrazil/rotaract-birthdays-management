(function() {
  "use strict";
  
  // ===== CONFIGURATION =====
  const config = {
    storageKey: 'rotaractMembers',
    monthNames: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
    monthNamesPT: [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ],
    toastDuration: 3000,
    maxNameLength: 60,
    minNameLength: 2
  };

  // ===== DOM REFERENCES =====
  const dom = {
    form: null,
    nameInput: null,
    dayInput: null,
    monthSelect: null,
    submitBtn: null,
    tableBody: null,
    emptyState: null
  };

  // ===== STATE MANAGEMENT =====
  let editMode = {
    active: false,
    memberId: null
  };

  // ===== UTILITY FUNCTIONS =====
  function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  function getMembers() {
    try {
      const data = localStorage.getItem(config.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      showToast('Error loading members data', 'error');
      return [];
    }
  }

  function saveMembers(members) {
    try {
      localStorage.setItem(config.storageKey, JSON.stringify(members));
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      if (error.name === 'QuotaExceededError') {
        showToast('Storage quota exceeded. Please delete some entries.', 'error');
      } else {
        showToast('Error saving data', 'error');
      }
      return false;
    }
  }

  function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  }

  // ===== DATE CALCULATION FUNCTIONS =====
  function getDaysUntilNextBirthday(day, month) {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Create birthday date for current year
    let birthday = new Date(currentYear, month - 1, day);
    
    // If birthday has passed this year, use next year
    if (birthday < today) {
      birthday = new Date(currentYear + 1, month - 1, day);
    }
    
    // Calculate days difference
    const diffTime = birthday - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  function sortByNextBirthday(members) {
    return [...members].sort((a, b) => {
      const daysA = getDaysUntilNextBirthday(a.day, a.month);
      const daysB = getDaysUntilNextBirthday(b.day, b.month);
      return daysA - daysB;
    });
  }

  function formatBirthDate(day, month) {
    return `${day} ${config.monthNames[month - 1]}`;
  }

  // ===== VALIDATION FUNCTIONS =====
  function validateName(name) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { valid: false, message: 'Name is required' };
    }
    if (trimmedName.length < config.minNameLength) {
      return { valid: false, message: `Name must be at least ${config.minNameLength} characters` };
    }
    if (trimmedName.length > config.maxNameLength) {
      return { valid: false, message: `Name must not exceed ${config.maxNameLength} characters` };
    }
    return { valid: true };
  }

  function validateDay(day) {
    const dayNum = parseInt(day, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      return { valid: false, message: 'Please enter a valid day (1-31)' };
    }
    return { valid: true };
  }

  function validateMonth(month) {
    const monthNum = parseInt(month, 10);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return { valid: false, message: 'Please select a valid month' };
    }
    return { valid: true };
  }

  function checkForDuplicates(name, day, month, excludeId = null) {
    const members = getMembers();
    return members.some(member => 
      member.id !== excludeId &&
      member.name.toLowerCase() === name.toLowerCase() &&
      member.day === day &&
      member.month === month
    );
  }

  // ===== CRUD OPERATIONS =====
  function addMember(name, day, month) {
    const members = getMembers();
    const newMember = {
      id: generateId(),
      name: sanitizeInput(name.trim()),
      day: parseInt(day, 10),
      month: parseInt(month, 10)
    };
    
    members.push(newMember);
    
    if (saveMembers(members)) {
      showToast(`${newMember.name} added successfully!`, 'success');
      return true;
    }
    return false;
  }

  function updateMember(id, name, day, month) {
    const members = getMembers();
    const memberIndex = members.findIndex(m => m.id === id);
    
    if (memberIndex === -1) {
      showToast('Member not found', 'error');
      return false;
    }
    
    members[memberIndex] = {
      ...members[memberIndex],
      name: sanitizeInput(name.trim()),
      day: parseInt(day, 10),
      month: parseInt(month, 10)
    };
    
    if (saveMembers(members)) {
      showToast(`${members[memberIndex].name} updated successfully!`, 'success');
      return true;
    }
    return false;
  }

  function deleteMember(memberId) {
    const members = getMembers();
    const memberToDelete = members.find(m => m.id === memberId);
    
    if (!memberToDelete) {
      showToast('Member not found', 'error');
      return false;
    }
    
    const confirmMessage = `Are you sure you want to delete ${memberToDelete.name}?`;
    if (!window.confirm(confirmMessage)) {
      return false;
    }
    
    const filteredMembers = members.filter(m => m.id !== memberId);
    
    if (saveMembers(filteredMembers)) {
      showToast(`${memberToDelete.name} deleted successfully`, 'info');
      return true;
    }
    return false;
  }

  // ===== UI RENDERING FUNCTIONS =====
  function renderMembers() {
    const members = getMembers();
    
    if (!dom.tableBody) return;
    
    // Clear existing content
    dom.tableBody.innerHTML = '';
    
    if (members.length === 0) {
      // Show empty state
      const emptyRow = document.createElement('tr');
      emptyRow.id = 'empty-state';
      emptyRow.innerHTML = `
        <td colspan="3">No members registered</td>
      `;
      dom.tableBody.appendChild(emptyRow);
      return;
    }
    
    // Sort members by next birthday
    const sortedMembers = sortByNextBirthday(members);
    
    // Render each member
    sortedMembers.forEach(member => {
      const row = createMemberRow(member);
      dom.tableBody.appendChild(row);
    });
  }

  function createMemberRow(member) {
    const row = document.createElement('tr');
    row.dataset.memberId = member.id;
    
    const daysUntil = getDaysUntilNextBirthday(member.day, member.month);
    const isToday = daysUntil === 0;
    const isSoon = daysUntil <= 7;
    
    if (isToday) row.classList.add('birthday-today');
    else if (isSoon) row.classList.add('birthday-soon');
    
    row.innerHTML = `
      <td data-label="Member Name">
        ${sanitizeInput(member.name)}
        ${isToday ? '<span class="birthday-badge">🎉 Today!</span>' : ''}
        ${isSoon && !isToday ? `<span class="birthday-badge">🎂 ${daysUntil} days</span>` : ''}
      </td>
      <td data-label="Birth Date">${formatBirthDate(member.day, member.month)}</td>
      <td data-label="Actions">
        <button class="action-btn edit" data-action="edit" data-id="${member.id}" 
                aria-label="Edit ${member.name}" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn delete" data-action="delete" data-id="${member.id}" 
                aria-label="Delete ${member.name}" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    return row;
  }

  // ===== TOAST NOTIFICATION SYSTEM =====
  function showToast(message, type = 'success') {
    // Remove existing toasts
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
      existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    
    // Set icon based on type
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };
    
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${sanitizeInput(message)}</span>
    `;
    
    // Add styles dynamically (since we can't modify CSS)
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'error' ? '#DC3545' : type === 'success' ? '#28A745' : '#17A2B8'};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 16px;
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
      max-width: 350px;
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    
    if (!document.querySelector('#toast-styles')) {
      style.id = 'toast-styles';
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, config.toastDuration);
  }

  // ===== EVENT HANDLERS =====
  function handleFormSubmit(event) {
    event.preventDefault();
    
    const name = dom.nameInput.value;
    const day = dom.dayInput.value;
    const month = dom.monthSelect.value;
    
    // Validate inputs
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      showToast(nameValidation.message, 'error');
      dom.nameInput.focus();
      return;
    }
    
    const dayValidation = validateDay(day);
    if (!dayValidation.valid) {
      showToast(dayValidation.message, 'error');
      dom.dayInput.focus();
      return;
    }
    
    const monthValidation = validateMonth(month);
    if (!monthValidation.valid) {
      showToast(monthValidation.message, 'error');
      dom.monthSelect.focus();
      return;
    }
    
    // Check for duplicates
    const isDuplicate = checkForDuplicates(
      name, 
      parseInt(day, 10), 
      parseInt(month, 10), 
      editMode.active ? editMode.memberId : null
    );
    
    if (isDuplicate) {
      showToast('This member already exists!', 'warning');
      return;
    }
    
    // Add or update member
    let success = false;
    if (editMode.active) {
      success = updateMember(editMode.memberId, name, day, month);
      if (success) {
        resetEditMode();
      }
    } else {
      success = addMember(name, day, month);
    }
    
    if (success) {
      dom.form.reset();
      renderMembers();
      dom.nameInput.focus();
    }
  }

  function handleTableClick(event) {
    const button = event.target.closest('.action-btn');
    if (!button) return;
    
    const action = button.dataset.action;
    const memberId = button.dataset.id;
    
    if (action === 'edit') {
      handleEdit(memberId);
    } else if (action === 'delete') {
      if (deleteMember(memberId)) {
        renderMembers();
      }
    }
  }

  function handleEdit(memberId) {
    const members = getMembers();
    const member = members.find(m => m.id === memberId);
    
    if (!member) {
      showToast('Member not found', 'error');
      return;
    }
    
    // Populate form with member data
    dom.nameInput.value = member.name;
    dom.dayInput.value = member.day;
    dom.monthSelect.value = member.month;
    
    // Enter edit mode
    editMode.active = true;
    editMode.memberId = memberId;
    
    // Update submit button
    dom.submitBtn.textContent = 'Update Member';
    dom.submitBtn.style.background = 'linear-gradient(135deg, #28A745 0%, #1E7E34 100%)';
    
    // Scroll to form and focus
    dom.form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    dom.nameInput.focus();
    
    // Add visual indicator
    dom.form.style.boxShadow = '0 0 20px rgba(40, 167, 69, 0.3)';
  }

  function resetEditMode() {
    editMode.active = false;
    editMode.memberId = null;
    dom.submitBtn.textContent = 'Save Member';
    dom.submitBtn.style.background = '';
    dom.form.style.boxShadow = '';
  }

  function handleEscapeKey(event) {
    if (event.key === 'Escape' && editMode.active) {
      resetEditMode();
      dom.form.reset();
      showToast('Edit cancelled', 'info');
    }
  }

  // ===== INITIALIZATION =====
  function initializeDOMReferences() {
    dom.form = document.getElementById('registration-form');
    dom.nameInput = document.getElementById('full-name');
    dom.dayInput = document.getElementById('birth-day');
    dom.monthSelect = document.getElementById('birth-month');
    dom.submitBtn = dom.form?.querySelector('button[type="submit"]');
    dom.tableBody = document.getElementById('members-list');
    dom.emptyState = document.getElementById('empty-state');
  }

  function attachEventListeners() {
    if (dom.form) {
      dom.form.addEventListener('submit', handleFormSubmit);
    }
    
    if (dom.tableBody) {
      dom.tableBody.addEventListener('click', handleTableClick);
    }
    
    // Add escape key handler for edit mode
    document.addEventListener('keydown', handleEscapeKey);
    
    // Add input validation listeners
    if (dom.dayInput) {
      dom.dayInput.addEventListener('input', function() {
        const value = parseInt(this.value, 10);
        if (value > 31) this.value = 31;
        if (value < 1 && this.value !== '') this.value = 1;
      });
    }
  }

  function checkBirthdaysOnLoad() {
    const members = getMembers();
    const todayBirthdays = members.filter(member => {
      const daysUntil = getDaysUntilNextBirthday(member.day, member.month);
      return daysUntil === 0;
    });
    
    if (todayBirthdays.length > 0) {
      const names = todayBirthdays.map(m => m.name).join(', ');
      setTimeout(() => {
        showToast(`🎉 Today's birthdays: ${names}!`, 'success');
      }, 1000);
    }
  }

  function init() {
    initializeDOMReferences();
    attachEventListeners();
    renderMembers();
    checkBirthdaysOnLoad();
    
    // Focus on name input on load
    if (dom.nameInput) {
      dom.nameInput.focus();
    }
  }

  // Start the application when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose limited API for debugging (optional)
  window.RotaractBirthdays = {
    getMembers,
    clearAll: () => {
      if (window.confirm('Are you sure you want to delete all members?')) {
        localStorage.removeItem(config.storageKey);
        renderMembers();
        showToast('All members deleted', 'info');
      }
    },
    exportData: () => {
      const members = getMembers();
      const dataStr = JSON.stringify(members, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rotaract-birthdays-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Data exported successfully', 'success');
    }
  };

})();