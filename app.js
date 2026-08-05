(function () {
  var LOCAL_STORAGE_KEY = 'mzweb_custom_cards';
  var LOCAL_EDITS_KEY = 'mzweb_card_edits';
  var LOCAL_DELETED_KEY = 'mzweb_deleted_default_ids';
  var LOCAL_DELETED_CUSTOM_KEY = 'mzweb_deleted_custom_ids';

  function getLocalCustomCards() {
    try { return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || []; } catch (_) { return []; }
  }

  function getLocalEdits() {
    try { return JSON.parse(localStorage.getItem(LOCAL_EDITS_KEY)) || {}; } catch (_) { return {}; }
  }

  function getLocalDeletedDefaults() {
    try { return JSON.parse(localStorage.getItem(LOCAL_DELETED_KEY)) || []; } catch (_) { return []; }
  }

  function getLocalDeletedCustoms() {
    try { return JSON.parse(localStorage.getItem(LOCAL_DELETED_CUSTOM_KEY)) || []; } catch (_) { return []; }
  }

  function getDeletedDefaultIds() {
    return cardDataCache.deletedDefaults;
  }

  function saveDeletedDefaultId(id) {
    if (cardDataCache.deletedDefaults.indexOf(id) === -1) {
      cardDataCache.deletedDefaults.push(id);
    }
    try { localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify(cardDataCache.deletedDefaults)); } catch (_) {}
    var token = sessionStorage.getItem('mzweb_token');
    if (token) {
      fetch('/api/cards/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      }).then(function (r) {
        if (!r.ok) showToast('Delete could not be synced to the server.', true);
      }).catch(function () {
        showToast('Delete could not be synced to the server.', true);
      });
    }
  }

  var DEFAULT_CARDS = [
    { id: 'default-1', name: 'MZ APPTI CODE', url: 'http://localhost:3012/sso.html', icon: 'fa-globe', image: '', isDefault: true },
    { id: 'default-2', name: 'AMS', url: 'https://example.com', icon: 'fa-gauge-high', image: '', isDefault: true },
    { id: 'default-3', name: 'ARTIFICIAL INTELLIGENCE', url: 'https://example.com', icon: 'fa-brain', image: '', isDefault: true },
  ];

  function loadDefaultCardsFromServer(callback) {
    fetch('/api/default-cards')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success && data.data && data.data.length > 0) {
          DEFAULT_CARDS = data.data;
        }
        if (callback) callback();
      })
      .catch(function() {
        if (callback) callback();
      });
  }

  var ICON_OPTIONS = [
    'fa-globe', 'fa-gauge-high', 'fa-brain', 'fa-rocket', 'fa-code',
    'fa-laptop-code', 'fa-database', 'fa-cloud', 'fa-server', 'fa-shield-halved',
    'fa-lock', 'fa-key', 'fa-chart-line', 'fa-chart-bar', 'fa-cogs',
    'fa-tools', 'fa-palette', 'fa-camera', 'fa-video', 'fa-music',
    'fa-book', 'fa-graduation-cap', 'fa-flask', 'fa-microscope', 'fa-calculator',
    'fa-pen-fancy', 'fa-file-alt', 'fa-folder', 'fa-envelope', 'fa-bell',
  ];

  // =====================
  // Login Page Logic
  // =====================
  var loginForm = document.getElementById('loginForm');
  if (loginForm) {
    if (sessionStorage.getItem('userName')) {
      window.location.replace('home.html');
      return;
    }

    var errorMessage = document.getElementById('error-message');
    var errorText = document.getElementById('error-text');
    var passwordInput = document.getElementById('password');
    var passwordToggle = document.getElementById('passwordToggle');
    var eyeIcon = document.getElementById('eyeIcon');
    var adminPasswordInput = document.getElementById('adminPassword');
    var submitBtn = document.getElementById('loginSubmitBtn');

    errorMessage.style.display = 'none';

    submitBtn.addEventListener('mousedown', function (e) {
      var ripple = document.createElement('span');
      ripple.className = 'ripple-effect';
      var rect = this.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      this.appendChild(ripple);
      ripple.addEventListener('animationend', function () { ripple.remove(); });
    });

    var activeLoginType = 'student';
    var userTypeSelect = document.getElementById('userTypeSelect');
    var studentSection = document.getElementById('studentSection');
    var hodSection = document.getElementById('hodSection');
    var principalSection = document.getElementById('principalSection');
    var alumniSection = document.getElementById('alumniSection');
    var adminSection = document.getElementById('adminSection');

    // Custom select dropdown logic
    var wrapper = document.getElementById('userTypeSelectWrapper');
    if (wrapper) {
      var trigger = wrapper.querySelector('.custom-select-trigger');
      var options = wrapper.querySelectorAll('.custom-option');
      var selectedText = document.getElementById('selectedUserText');

      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        wrapper.classList.toggle('open');
      });

      options.forEach(function (option) {
        option.addEventListener('click', function (e) {
          e.stopPropagation();
          options.forEach(function (opt) { opt.classList.remove('selected'); });
          this.classList.add('selected');
          
          var value = this.getAttribute('data-value');
          var labelText = this.querySelector('span').textContent;
          selectedText.textContent = labelText;
          userTypeSelect.value = value;
          activeLoginType = value;

          studentSection.classList.toggle('active', activeLoginType === 'student');
          hodSection.classList.toggle('active', activeLoginType === 'hod');
          principalSection.classList.toggle('active', activeLoginType === 'principal');
          alumniSection.classList.toggle('active', activeLoginType === 'alumni');
          adminSection.classList.toggle('active', activeLoginType === 'admin');
          errorMessage.style.display = 'none';

          wrapper.classList.remove('open');
        });
      });

      document.addEventListener('click', function () {
        wrapper.classList.remove('open');
      });
    }

    if (passwordToggle) {
      passwordToggle.addEventListener('click', function () {
        var type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        if (type === 'text') {
          eyeIcon.innerHTML =
            '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>' +
            '<line x1="1" y1="1" x2="23" y2="23"></line>';
        } else {
          eyeIcon.innerHTML =
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>' +
            '<circle cx="12" cy="12" r="3"></circle>';
        }
      });
    }

    // HOD Password Toggle
    var hodPasswordInput = document.getElementById('hodPassword');
    var hodPasswordToggle = document.getElementById('hodPasswordToggle');
    var hodEyeIcon = document.getElementById('hodEyeIcon');
    if (hodPasswordToggle) {
      hodPasswordToggle.addEventListener('click', function () {
        var type = hodPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        hodPasswordInput.setAttribute('type', type);
        if (type === 'text') {
          hodEyeIcon.innerHTML =
            '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>' +
            '<line x1="1" y1="1" x2="23" y2="23"></line>';
        } else {
          hodEyeIcon.innerHTML =
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>' +
            '<circle cx="12" cy="12" r="3"></circle>';
        }
      });
    }

    // Principal Password Toggle
    var principalPasswordInput = document.getElementById('principalPassword');
    var principalPasswordToggle = document.getElementById('principalPasswordToggle');
    var principalEyeIcon = document.getElementById('principalEyeIcon');
    if (principalPasswordToggle) {
      principalPasswordToggle.addEventListener('click', function () {
        var type = principalPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        principalPasswordInput.setAttribute('type', type);
        if (type === 'text') {
          principalEyeIcon.innerHTML =
            '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>' +
            '<line x1="1" y1="1" x2="23" y2="23"></line>';
        } else {
          principalEyeIcon.innerHTML =
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>' +
            '<circle cx="12" cy="12" r="3"></circle>';
        }
      });
    }

    // Alumni Password Toggle
    var alumniPasswordInput = document.getElementById('alumniPassword');
    var alumniPasswordToggle = document.getElementById('alumniPasswordToggle');
    var alumniEyeIcon = document.getElementById('alumniEyeIcon');
    if (alumniPasswordToggle) {
      alumniPasswordToggle.addEventListener('click', function () {
        var type = alumniPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        alumniPasswordInput.setAttribute('type', type);
        if (type === 'text') {
          alumniEyeIcon.innerHTML =
            '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>' +
            '<line x1="1" y1="1" x2="23" y2="23"></line>';
        } else {
          alumniEyeIcon.innerHTML =
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>' +
            '<circle cx="12" cy="12" r="3"></circle>';
        }
      });
    }

    // Admin Password Toggle
    var adminPasswordToggle = document.getElementById('adminPasswordToggle');
    var adminEyeIcon = document.getElementById('adminEyeIcon');
    if (adminPasswordToggle) {
      adminPasswordToggle.addEventListener('click', function () {
        var type = adminPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        adminPasswordInput.setAttribute('type', type);
        if (type === 'text') {
          adminEyeIcon.innerHTML =
            '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>' +
            '<line x1="1" y1="1" x2="23" y2="23"></line>';
        } else {
          adminEyeIcon.innerHTML =
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>' +
            '<circle cx="12" cy="12" r="3"></circle>';
        }
      });
    }

    var forgotLink = document.getElementById('forgotLink');
    if (forgotLink) {
      forgotLink.addEventListener('click', function (e) {
        e.preventDefault();
        showForgotModal();
      });
    }

    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitBtn.classList.contains('loading') || submitBtn.classList.contains('success')) return;

      var username = '';
      var password = '';

      if (activeLoginType === 'student') {
        username = document.getElementById('registerNumber').value.trim();
        password = passwordInput.value.trim();
        if (!username || !password) {
          showError('Please enter both Register Number and Password.');
          return;
        }
      } else if (activeLoginType === 'hod') {
        username = document.getElementById('hodId').value.trim();
        password = document.getElementById('hodPassword').value.trim();
        if (!username || !password) { showError('Please enter both HOD ID and Password.'); return; }
      } else if (activeLoginType === 'principal') {
        username = document.getElementById('principalId').value.trim();
        password = document.getElementById('principalPassword').value.trim();
        if (!username || !password) { showError('Please enter both Principal ID and Password.'); return; }
      } else if (activeLoginType === 'alumni') {
        username = document.getElementById('alumniId').value.trim();
        password = document.getElementById('alumniPassword').value.trim();
        if (!username || !password) { showError('Please enter both Alumni ID and Password.'); return; }
      } else {
        username = document.getElementById('adminId').value.trim();
        password = adminPasswordInput.value.trim();
        if (!username || !password) { showError('Please enter both Admin ID and Password.'); return; }
      }

      errorMessage.style.display = 'none';
      submitBtn.classList.add('loading');

      fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: activeLoginType, username: username, password: password }),
      })
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok) {
              throw new Error(data.message || 'Login failed');
            }
            return data;
          });
        })
        .then(function (data) {
          sessionStorage.setItem('registerNumber', data.user.registerNumber);
          sessionStorage.setItem('userName', data.user.name);
          sessionStorage.setItem('mzweb_role', data.user.role);
          if (data.token) {
            sessionStorage.setItem('mzweb_token', data.token);
          }
          // Only full 'admin' role gets admin privileges (can add/edit/delete portals)
          if (data.user.role === 'admin') {
            sessionStorage.setItem('mzweb_admin', 'true');
          } else {
            sessionStorage.removeItem('mzweb_admin');
          }

          if (data.needsPasswordChange) {
            submitBtn.classList.remove('loading');
            sessionStorage.setItem('pendingRegNumber', data.user.registerNumber);
            sessionStorage.setItem('pendingName', data.user.name);
            sessionStorage.setItem('pendingRole', data.user.role);
            showPasswordChangeModal(data.user.registerNumber, password);
            return;
          }

          submitBtn.classList.remove('loading');
          submitBtn.classList.add('success');

          setTimeout(function () {
            window.location.replace('home.html');
          }, 700);
        })
        .catch(function (err) {
          submitBtn.classList.remove('loading');
          showError(err.message);
        });
    });

    function showError(message) {
      errorText.textContent = message;
      errorMessage.style.display = 'flex';
    }

    // =====================
    // Password Change Flow
    // =====================
    var passwordChangeModal = document.getElementById('passwordChangeModal');
    var passwordChangeForm = document.getElementById('passwordChangeForm');
    var newPasswordInput = document.getElementById('newPasswordInput');
    var confirmPasswordInput = document.getElementById('confirmPasswordInput');
    var passwordChangeError = document.getElementById('passwordChangeError');
    var passwordChangeErrorText = document.getElementById('passwordChangeErrorText');
    var passwordChangeSuccess = document.getElementById('passwordChangeSuccess');
    var passwordChangeSubmitBtn = document.getElementById('passwordChangeSubmitBtn');
    var generatePasswordBtn = document.getElementById('generatePasswordBtn');
    var pendingRegisterNumber = null;
    var pendingCurrentPassword = null;
    var pendingRole = null;
    var passwordChangeInProgress = false;

    function getPasswordConditions() {
      return document.querySelectorAll('.password-conditions .condition');
    }

    function validatePassword(password) {
      var result = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
      };
      return result;
    }

    function updatePasswordConditions(password) {
      var conditions = validatePassword(password);
      getPasswordConditions().forEach(function (el) {
        var key = el.getAttribute('data-condition');
        if (conditions[key]) {
          el.classList.add('met');
        } else {
          el.classList.remove('met');
        }
      });
      return conditions.length && conditions.uppercase && conditions.lowercase && conditions.number && conditions.special;
    }

    function generateRandomPassword() {
      var upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      var lower = 'abcdefghijklmnopqrstuvwxyz';
      var digits = '0123456789';
      var special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      var all = upper + lower + digits + special;
      var password = '';
      password += upper[Math.floor(Math.random() * upper.length)];
      password += lower[Math.floor(Math.random() * lower.length)];
      password += digits[Math.floor(Math.random() * digits.length)];
      password += special[Math.floor(Math.random() * special.length)];
      for (var i = 0; i < 8; i++) {
        password += all[Math.floor(Math.random() * all.length)];
      }
      password = password.split('').sort(function () { return Math.random() - 0.5; }).join('');
      return password;
    }

    if (newPasswordInput) {
      newPasswordInput.addEventListener('input', function () {
        updatePasswordConditions(newPasswordInput.value);
      });
    }

    if (generatePasswordBtn) {
      generatePasswordBtn.addEventListener('click', function () {
        var generated = generateRandomPassword();
        newPasswordInput.value = generated;
        confirmPasswordInput.value = '';
        updatePasswordConditions(generated);
        passwordChangeError.style.display = 'none';
      });
    }

    var passwordChangeBackBtn = document.getElementById('passwordChangeBackBtn');
    if (passwordChangeBackBtn) {
      passwordChangeBackBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (passwordChangeInProgress) {
          return;
        }
        hidePasswordChangeModal();
        sessionStorage.removeItem('pendingRegNumber');
        sessionStorage.removeItem('pendingName');
        sessionStorage.removeItem('pendingRole');
        sessionStorage.removeItem('mzweb_token');
        sessionStorage.removeItem('mzweb_role');
        sessionStorage.removeItem('registerNumber');
        sessionStorage.removeItem('userName');
        window.location.href = 'login.html';
      });
    }

    function setupPasswordToggle(toggleId, inputId, eyeId) {
      var toggle = document.getElementById(toggleId);
      var input = document.getElementById(inputId);
      var eye = document.getElementById(eyeId);
      if (!toggle || !input || !eye) return;
      toggle.addEventListener('click', function () {
        var type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        if (type === 'text') {
          eye.innerHTML =
            '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>' +
            '<line x1="1" y1="1" x2="23" y2="23"></line>';
        } else {
          eye.innerHTML =
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>' +
            '<circle cx="12" cy="12" r="3"></circle>';
        }
      });
    }
    setupPasswordToggle('newPasswordToggle', 'newPasswordInput', 'newPasswordEye');
    setupPasswordToggle('confirmPasswordToggle', 'confirmPasswordInput', 'confirmPasswordEye');

    // =====================
    // Forgot Password Flow
    // =====================
    var forgotOverlay = document.getElementById('forgotPasswordOverlay');
    var forgotStepVerify = document.getElementById('forgotStepVerify');
    var forgotStepReset = document.getElementById('forgotStepReset');
    var forgotRegInput = document.getElementById('forgotRegNumber');
    var forgotDobInput = document.getElementById('forgotDob');
    var forgotVerifyBtn = document.getElementById('forgotVerifyBtn');
    var forgotError = document.getElementById('forgotError');
    var forgotErrorText = document.getElementById('forgotErrorText');
    var forgotBackLink = document.getElementById('forgotBackLink');
    var forgotResetForm = document.getElementById('forgotResetForm');
    var forgotNewPassword = document.getElementById('forgotNewPassword');
    var forgotConfirmPassword = document.getElementById('forgotConfirmPassword');
    var forgotResetError = document.getElementById('forgotResetError');
    var forgotResetErrorText = document.getElementById('forgotResetErrorText');
    var forgotResetSuccess = document.getElementById('forgotResetSuccess');
    var forgotResetSubmitBtn = document.getElementById('forgotResetSubmitBtn');
    var pendingResetToken = null;

    function showForgotModal() {
      forgotError.style.display = 'none';
      forgotResetError.style.display = 'none';
      forgotResetSuccess.style.display = 'none';
      forgotRegInput.value = '';
      forgotDobInput.value = '';
      forgotNewPassword.value = '';
      forgotConfirmPassword.value = '';
      forgotStepVerify.style.display = '';
      forgotStepReset.style.display = 'none';
      forgotOverlay.style.display = 'flex';
    }

    function hideForgotModal() {
      forgotOverlay.style.display = 'none';
    }

    function showForgotError(msg) {
      forgotErrorText.textContent = msg;
      forgotError.style.display = 'flex';
    }

    function showForgotResetError(msg) {
      forgotResetErrorText.textContent = msg;
      forgotResetError.style.display = 'flex';
      forgotResetSuccess.style.display = 'none';
    }

    if (forgotDobInput) {
      forgotDobInput.addEventListener('input', function () {
        var val = this.value.replace(/[^0-9]/g, '');
        var formatted = '';
        if (val.length > 0) {
          formatted += val.substring(0, 2);
          if (val.length > 2) {
            formatted += '/' + val.substring(2, 4);
            if (val.length > 4) {
              formatted += '/' + val.substring(4, 8);
            }
          }
        }
        this.value = formatted;
      });
    }

    if (forgotVerifyBtn) {
      forgotVerifyBtn.addEventListener('click', function () {
        var reg = forgotRegInput.value.trim();
        var dob = forgotDobInput.value.trim();

        if (!reg || !dob) {
          showForgotError('Please enter Register Number and Date of Birth.');
          return;
        }
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
          showForgotError('Please enter a valid date in DD/MM/YYYY format.');
          return;
        }

        forgotError.style.display = 'none';
        forgotVerifyBtn.classList.add('loading');

        fetch('/api/forgot-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registerNumber: reg, dob: dob }),
        })
          .then(function (response) {
            return response.json().then(function (data) {
              if (!response.ok) throw new Error(data.message || 'Verification failed');
              return data;
            });
          })
          .then(function (data) {
            forgotVerifyBtn.classList.remove('loading');
            pendingResetToken = data.resetToken;
            forgotStepVerify.style.display = 'none';
            forgotStepReset.style.display = '';
            forgotNewPassword.value = '';
            forgotConfirmPassword.value = '';
            forgotResetError.style.display = 'none';
            forgotResetSuccess.style.display = 'none';
            updateForgotPasswordConditions('');
          })
          .catch(function (err) {
            forgotVerifyBtn.classList.remove('loading');
            showForgotError(err.message);
          });
      });
    }

    if (forgotBackLink) {
      forgotBackLink.addEventListener('click', function (e) {
        e.preventDefault();
        hideForgotModal();
      });
    }

    if (forgotOverlay) {
      forgotOverlay.addEventListener('click', function (e) {
        if (e.target === forgotOverlay) hideForgotModal();
      });
    }

    function updateForgotPasswordConditions(password) {
      var conditions = validatePassword(password);
      document.querySelectorAll('#forgotPasswordConditions .condition').forEach(function (el) {
        var key = el.getAttribute('data-condition');
        if (conditions[key]) {
          el.classList.add('met');
        } else {
          el.classList.remove('met');
        }
      });
      return conditions.length && conditions.uppercase && conditions.lowercase && conditions.number && conditions.special;
    }

    if (forgotNewPassword) {
      forgotNewPassword.addEventListener('input', function () {
        updateForgotPasswordConditions(forgotNewPassword.value);
      });
    }

    setupPasswordToggle('forgotNewPasswordToggle', 'forgotNewPassword', 'forgotNewPasswordEye');
    setupPasswordToggle('forgotConfirmPasswordToggle', 'forgotConfirmPassword', 'forgotConfirmPasswordEye');

    if (forgotResetForm) {
      forgotResetForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (forgotResetSubmitBtn.classList.contains('loading') || forgotResetSubmitBtn.classList.contains('success')) return;

        var newPassword = forgotNewPassword.value.trim();
        var confirmPassword = forgotConfirmPassword.value.trim();

        if (!newPassword || !confirmPassword) {
          showForgotResetError('Please fill in both password fields.');
          return;
        }

        if (/mzcet/i.test(newPassword)) {
          showForgotResetError('New password cannot be similar to the default password.');
          return;
        }

        if (!updateForgotPasswordConditions(newPassword)) {
          showForgotResetError('Password does not meet all requirements.');
          return;
        }

        if (newPassword !== confirmPassword) {
          showForgotResetError('Passwords do not match.');
          return;
        }

        forgotResetError.style.display = 'none';
        forgotResetSubmitBtn.classList.add('loading');

        fetch('/api/forgot-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resetToken: pendingResetToken,
            newPassword: newPassword,
          }),
        })
          .then(function (response) {
            return response.json().then(function (data) {
              if (!response.ok) throw new Error(data.message || 'Failed to reset password');
              return data;
            });
          })
          .then(function (data) {
            forgotResetSubmitBtn.classList.remove('loading');
            forgotResetSubmitBtn.classList.add('success');
            forgotResetSuccess.style.display = 'flex';
            setTimeout(function () {
              hideForgotModal();
              window.location.replace('login.html');
            }, 1500);
          })
          .catch(function (err) {
            forgotResetSubmitBtn.classList.remove('loading');
            showForgotResetError(err.message);
          });
      });
    }

    function showPasswordChangeModal(registerNumber, currentPassword) {
      pendingRegisterNumber = registerNumber;
      pendingCurrentPassword = currentPassword;
      pendingRole = sessionStorage.getItem('pendingRole');
      passwordChangeError.style.display = 'none';
      passwordChangeSuccess.style.display = 'none';
      newPasswordInput.value = '';
      confirmPasswordInput.value = '';
      passwordChangeModal.style.display = 'flex';
    }

    function hidePasswordChangeModal() {
      passwordChangeModal.style.display = 'none';
    }

    function showPasswordChangeError(message) {
      passwordChangeErrorText.textContent = message;
      passwordChangeError.style.display = 'flex';
      passwordChangeSuccess.style.display = 'none';
    }

    if (passwordChangeForm) {
      passwordChangeForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (passwordChangeSubmitBtn.classList.contains('loading') || passwordChangeSubmitBtn.classList.contains('success')) return;

        var newPassword = newPasswordInput.value.trim();
        var confirmPassword = confirmPasswordInput.value.trim();

        if (!newPassword || !confirmPassword) {
          showPasswordChangeError('Please fill in both password fields.');
          return;
        }

        if (/mzcet/i.test(newPassword)) {
          showPasswordChangeError('New password cannot be similar to the default password.');
          return;
        }

        var passwordValid = updatePasswordConditions(newPassword);
        if (!passwordValid) {
          showPasswordChangeError('Password does not meet all requirements.');
          return;
        }

        if (newPassword !== confirmPassword) {
          showPasswordChangeError('Passwords do not match.');
          return;
        }

        passwordChangeError.style.display = 'none';
        passwordChangeSubmitBtn.classList.add('loading');
        passwordChangeInProgress = true;

        fetch('/api/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            registerNumber: pendingRegisterNumber,
            currentPassword: pendingCurrentPassword,
            newPassword: newPassword,
            role: pendingRole,
          }),
        })
          .then(function (response) {
            return response.json().then(function (data) {
              if (!response.ok) {
                throw new Error(data.message || 'Failed to change password');
              }
              return data;
            });
          })
          .then(function (data) {
            passwordChangeSubmitBtn.classList.remove('loading');
            passwordChangeSubmitBtn.classList.add('success');
            passwordChangeSuccess.style.display = 'flex';
            passwordChangeInProgress = false;

            setTimeout(function () {
              hidePasswordChangeModal();
              sessionStorage.removeItem('pendingRegNumber');
              sessionStorage.removeItem('pendingName');
              sessionStorage.removeItem('pendingRole');
              sessionStorage.removeItem('mzweb_token');
              sessionStorage.removeItem('mzweb_role');
              sessionStorage.removeItem('registerNumber');
              sessionStorage.removeItem('userName');
              window.location.href = 'login.html';
            }, 1200);
          })
          .catch(function (err) {
            passwordChangeSubmitBtn.classList.remove('loading');
            passwordChangeInProgress = false;
            showPasswordChangeError(err.message);
          });
      });
    }
    return;
  }

  // =====================
  // Home/Dashboard Page Logic
  // =====================
  var userNameDisplay = document.getElementById('userNameDisplay');
  if (!userNameDisplay) return;

  var storedToken = sessionStorage.getItem('mzweb_token');

  if (!storedToken) {
    window.location.replace('login.html');
    return;
  }

  fetch('/api/verify-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: storedToken }),
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (!data.valid) {
        sessionStorage.clear();
        window.location.replace('login.html');
      }
    })
    .catch(function () {
      sessionStorage.clear();
      window.location.replace('login.html');
    });

  var storedName = sessionStorage.getItem('userName');
  var atIndex = storedName ? storedName.indexOf('@') : -1;
  if (atIndex > 0) {
    storedName = storedName.substring(0, atIndex).replace(/\d+$/, '');
  }
  if (storedName) {
    storedName = storedName.replace(/(^|[_\.])(\w)/g, function (m, sep, ch) { return sep + ch.toUpperCase(); });
  }
  var storedReg = sessionStorage.getItem('registerNumber');
  var isAdmin = sessionStorage.getItem('mzweb_admin') === 'true';
  var userRole = sessionStorage.getItem('mzweb_role');

  if (userNameDisplay) {
    if (userRole === 'hod') {
      var hodName = (storedName || 'HOD').replace(/^hod\s*/i, '').toUpperCase();
      userNameDisplay.textContent = 'HOD' + (hodName ? ' ' + hodName.replace(/[_\.]/g, ' ') : '');
    } else if (userRole === 'principal') {
      userNameDisplay.textContent = (storedName || 'PRINCIPAL').toUpperCase();
    } else if (isAdmin) {
      userNameDisplay.textContent = 'ADMINISTRATOR';
    } else if (userRole === 'alumni') {
      userNameDisplay.textContent = (storedName || 'ALUMNI').toUpperCase();
    } else {
      userNameDisplay.textContent = storedName || 'Student';
    }
  }
var regDisplay = document.getElementById('registerDisplay');
var regContainer = document.getElementById('userRegContainer');

if (userRole && userRole.toLowerCase() === 'student') {
    if (regDisplay && storedReg) {
        regDisplay.textContent = storedReg;
    }
    if (regContainer) {
        regContainer.style.display = 'block';
    }
} else {
    if (regContainer) {
        regContainer.style.display = 'none';
    }
}

  var welcomeTitle = document.getElementById('welcomeTitle');
  if (welcomeTitle) {
    if (userRole === 'hod') {
      welcomeTitle.textContent = 'Welcome back, Head of Department!';
    } else if (userRole === 'principal') {
      welcomeTitle.textContent = 'Welcome back, Principal!';
    } else if (isAdmin) {
      welcomeTitle.textContent = 'WELCOME, Administrator!';
    } else if (storedReg) {
      welcomeTitle.textContent = 'WELCOME, ' + storedName ;
    }
  }

  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      sessionStorage.clear();
      window.location.replace('login.html');
    });
  }

  // =====================
  // Admin State & Modal
  // =====================
  var editingCardId = null;

  var fabAdd = document.getElementById('fabAdd');
  var adminPanelBar = document.getElementById('adminPanelBar');
  var userRegContainer = document.getElementById('userRegContainer');
  var websiteModal = document.getElementById('websiteModal');
  var selectedIcon = 'fa-globe';
  var selectedTab = 'icon';
  var uploadedFileData = null;

  if (isAdmin) {
    if (fabAdd) fabAdd.classList.add('visible');
    if (adminPanelBar) adminPanelBar.style.display = 'flex';
    if (userRegContainer) userRegContainer.style.display = 'none';
  } else {
    if (adminPanelBar) adminPanelBar.style.display = 'none';
  }

  // Search filter
  var searchQuery = '';
  var searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function (e) {
      searchQuery = e.target.value.toLowerCase().trim();
      renderCards();
    });
  }

  // Close modal
  document.getElementById('websiteModalClose').addEventListener('click', closeModal);
  websiteModal.addEventListener('click', function (e) {
    if (e.target === websiteModal) closeModal();
  });

  if (fabAdd) {
    fabAdd.addEventListener('click', function () {
      openAddModal();
    });
  }

  var adminAddBtn = document.getElementById('adminAddBtn');
  if (adminAddBtn) {
    adminAddBtn.addEventListener('click', function () {
      openAddModal();
    });
  }

  function openAddModal() {
    editingCardId = null;
    document.getElementById('websiteModalTitle').textContent = 'Add Website';
    document.getElementById('websiteModalSub').textContent = 'Add a new website card to the portal.';
    document.getElementById('websiteModalSubmit').innerHTML = '<i class="fas fa-plus"></i>&nbsp; <span id="websiteModalSubmitText">Add Website</span>';
    document.getElementById('websiteModalSubmitText').textContent = 'Add Website';
    resetModalFields();
    websiteModal.classList.add('active');
  }

  function openEditModal(card) {
    editingCardId = card.id;
    document.getElementById('websiteModalTitle').textContent = 'Edit Website';
    document.getElementById('websiteModalSub').textContent = 'Update the website card details.';
    document.getElementById('websiteModalSubmit').innerHTML = '<i class="fas fa-floppy-disk"></i>&nbsp; <span id="websiteModalSubmitText">Save Changes</span>';

    resetModalFields();
    document.getElementById('websiteName').value = card.name;
    document.getElementById('websiteUrl').value = card.url;

    if (card.image) {
      selectedTab = 'image';
      document.getElementById('logoImageUrl').value = card.image;
      document.querySelectorAll('.tab-switch button').forEach(function (b) { b.classList.remove('active'); });
      document.querySelector('.tab-switch button[data-tab="image"]').classList.add('active');
      document.getElementById('iconPicker').style.display = 'none';
      document.getElementById('imageUrlInput').style.display = '';
      document.getElementById('uploadInput').style.display = 'none';
    } else if (card.icon) {
      selectedTab = 'icon';
      selectedIcon = card.icon;
      document.querySelectorAll('.tab-switch button').forEach(function (b) { b.classList.remove('active'); });
      document.querySelector('.tab-switch button[data-tab="icon"]').classList.add('active');
      document.getElementById('iconPicker').style.display = '';
      document.getElementById('imageUrlInput').style.display = 'none';
      document.getElementById('uploadInput').style.display = 'none';
      document.querySelectorAll('.icon-option').forEach(function (el) {
        el.classList.toggle('selected', el.querySelector('i').className.indexOf(card.icon) !== -1);
      });
    }

    updateLogoPreview();
    websiteModal.classList.add('active');
  }

  function closeModal() {
    websiteModal.classList.remove('active');
    editingCardId = null;
    uploadedFileData = null;
    document.getElementById('addWebsiteError').classList.remove('show');
  }

  function resetModalFields() {
    document.getElementById('websiteName').value = '';
    document.getElementById('websiteUrl').value = '';
    document.getElementById('logoImageUrl').value = '';
    document.getElementById('uploadFileName').textContent = '';
    document.getElementById('addWebsiteError').classList.remove('show');
    uploadedFileData = null;
    selectedIcon = 'fa-globe';
    selectedTab = 'icon';
    document.getElementById('iconPicker').style.display = '';
    document.getElementById('imageUrlInput').style.display = 'none';
    document.getElementById('uploadInput').style.display = 'none';
    document.querySelectorAll('.tab-switch button').forEach(function (b) { b.classList.remove('active'); });
    document.querySelector('.tab-switch button[data-tab="icon"]').classList.add('active');
    document.querySelectorAll('.icon-option').forEach(function (el) { el.classList.remove('selected'); });
    var firstIcon = document.querySelector('.icon-option');
    if (firstIcon) firstIcon.classList.add('selected');
    updateLogoPreview();
  }

  // Tab switch for icon/image/upload
  document.querySelectorAll('.tab-switch button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab-switch button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      selectedTab = btn.getAttribute('data-tab');
      document.getElementById('iconPicker').style.display = selectedTab === 'icon' ? '' : 'none';
      document.getElementById('imageUrlInput').style.display = selectedTab === 'image' ? '' : 'none';
      document.getElementById('uploadInput').style.display = selectedTab === 'upload' ? '' : 'none';
      updateLogoPreview();
    });
  });

  // Icon picker
  function buildIconGrid() {
    var grid = document.getElementById('iconGrid');
    grid.innerHTML = '';
    ICON_OPTIONS.forEach(function (icon) {
      var div = document.createElement('div');
      div.className = 'icon-option' + (icon === selectedIcon ? ' selected' : '');
      div.innerHTML = '<i class="fas ' + icon + '"></i>';
      div.addEventListener('click', function () {
        document.querySelectorAll('.icon-option').forEach(function (el) { el.classList.remove('selected'); });
        div.classList.add('selected');
        selectedIcon = icon;
        updateLogoPreview();
      });
      grid.appendChild(div);
    });
  }
  buildIconGrid();

  document.getElementById('logoImageUrl').addEventListener('input', function () { updateLogoPreview(); });

  // File upload
  document.getElementById('logoFileInput').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    document.getElementById('uploadFileName').textContent = file.name;
    var reader = new FileReader();
    reader.onload = function (event) {
      uploadedFileData = event.target.result;
      updateLogoPreview();
    };
    reader.readAsDataURL(file);
  });

  function updateLogoPreview() {
    var preview = document.getElementById('logoPreview');
    if (selectedTab === 'image') {
      var url = document.getElementById('logoImageUrl').value.trim();
      if (url) {
        preview.innerHTML = '<img src="' + encodeURI(url) + '" alt="Logo" onerror="this.parentElement.innerHTML=\'<i class=\\\'fas fa-image\\\'></i>\';this.parentElement.classList.remove(\'has-image\')">';
        preview.classList.add('has-image');
      } else {
        preview.innerHTML = '<i class="fas fa-image"></i>';
        preview.classList.remove('has-image');
      }
    } else if (selectedTab === 'upload' && uploadedFileData) {
      preview.innerHTML = '<img src="' + uploadedFileData + '" alt="Logo" style="width:100%;height:100%;object-fit:cover;border-radius:18px;">';
      preview.classList.add('has-image');
    } else if (selectedTab === 'upload') {
      preview.innerHTML = '<i class="fas fa-cloud-arrow-up"></i>';
      preview.classList.remove('has-image');
    } else {
      preview.innerHTML = '<i class="fas ' + selectedIcon + '"></i>';
      preview.classList.remove('has-image');
    }
  }

  // Submit (Add / Edit)
  var modalBusy = false;
  // Submits are chained so a quick follow-up action (e.g. editing a card right
  // after adding it) is queued instead of being dropped by the modalBusy guard
  // while the previous add POST is still in flight.
  var submitChain = Promise.resolve();
  var handleSubmit = function () {
    if (modalBusy) return;

    var name = document.getElementById('websiteName').value.trim();
    var url = document.getElementById('websiteUrl').value.trim();
    if (!name || !url) {
      document.getElementById('addWebsiteErrorText').textContent = 'Please fill in Website Name and URL.';
      document.getElementById('addWebsiteError').classList.add('show');
      return;
    }
    var icon = '';
    var image = '';
    if (selectedTab === 'icon') {
      icon = selectedIcon;
    } else if (selectedTab === 'upload' && uploadedFileData) {
      image = uploadedFileData;
    } else if (selectedTab === 'image') {
      image = document.getElementById('logoImageUrl').value.trim();
    } else {
      icon = selectedIcon;
    }

    if (editingCardId) {
      modalBusy = true;
      saveEdit(editingCardId, { name: name, url: url, icon: icon, image: image });
      modalBusy = false;
      closeModal();
      renderCards();
      return;
    }

    modalBusy = true;
    var newCard = {
      id: 'custom-' + Date.now(),
      name: name,
      url: url,
      icon: icon,
      image: image,
      isDefault: false,
    };
    var customCards = getCustomCards();
    customCards.push(newCard);
    saveCustomCards(customCards);
    sessionAddedIds[newCard.id] = true;
    renderCards();
    closeModal();

    var token = sessionStorage.getItem('mzweb_token');
    if (!token) {
      modalBusy = false;
      showToast('Card saved locally only. Login as admin to sync it to the server.', true);
      return;
    }
    return pendingPosts[newCard.id] = fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(newCard)
    })
      .then(function (r) {
        if (!r.ok) throw new Error('Card POST failed: ' + r.status);
      })
      .then(function () {
        showToast('Card synced to the server.', false);
      })
      .catch(function (e) {
        console.error('Card POST error:', e);
        showToast('Card saved locally, but could not be synced to the server. Other systems may not see it.', true);
      })
      .then(function () {
        delete pendingPosts[newCard.id];
        modalBusy = false;
      });
  };
  document.getElementById('websiteModalSubmit').addEventListener('click', function () {
    submitChain = submitChain.then(handleSubmit);
  });

  // =====================
  // Server-backed Card Data Storage (syncs across all computers)
  // =====================
  var cardDataCache = { customCards: [], edits: {}, deletedDefaults: [], deletedCustoms: [] };
  // False until the initial server load finishes; renderCards() is a no-op
  // before that so search/first paint never shows fallback default cards.
  var cardsLoaded = false;
  // Custom card ids added during THIS page session (their POST is already in flight)
  var sessionAddedIds = {};
  // In-flight add POSTs, keyed by card id (edit PUTs must wait for them to avoid 404)
  var pendingPosts = {};

  function loadCardsFromServer(callback) {
    var token = sessionStorage.getItem('mzweb_token');
    fetch('/api/cards')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success || !data.data) {
          throw new Error('Invalid server response');
        }
        var server = data.data;
        var serverCustom = server.customCards || [];
        var serverCustomIds = serverCustom.map(function (c) { return c.id; });
        var serverDeletedCustoms = server.deletedCustoms || [];
        var serverDeletedDefaults = server.deletedDefaults || [];
        var localCustom = getLocalCustomCards();
        var localEdits = getLocalEdits();
        var localDeletedCustoms = getLocalDeletedCustoms();
        var localDeletedDefaults = getLocalDeletedDefaults();

        // Union of tombstones: a card deleted anywhere (this browser or the server)
        // must never come back, even from stale localStorage copies.
        var tombstone = {};
        serverDeletedCustoms.concat(localDeletedCustoms).forEach(function (id) {
          tombstone[id] = true;
        });

        // Server is authoritative: server cards minus tombstoned ones,
        // plus any local-only cards (offline additions / in-flight adds this session).
        var finalCustom = serverCustom.filter(function (c) { return !tombstone[c.id]; });
        var finalIds = finalCustom.map(function (c) { return c.id; });
        var syncPosts = [];

        localCustom.forEach(function (c) {
          if (tombstone[c.id]) return;
          if (finalIds.indexOf(c.id) !== -1) return;
          finalCustom.push(c);
          finalIds.push(c.id);
          if (isAdmin && token && !sessionAddedIds[c.id]) {
            syncPosts.push(fetch('/api/cards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body: JSON.stringify(c)
            }));
          }
        });
        cardDataCache.customCards = finalCustom;

        // Edits: server is authoritative for default cards; keep unsynced local
        // default-card edits (offline sessions) and push them up.
        var edits = {};
        var serverEdits = server.edits || {};
        Object.keys(serverEdits).forEach(function (k) { edits[k] = serverEdits[k]; });
        Object.keys(localEdits).forEach(function (k) {
          if (k.indexOf('default-') !== 0) return;
          if (edits[k]) return;
          edits[k] = localEdits[k];
          if (isAdmin && token) {
            syncPosts.push(fetch('/api/cards/' + encodeURIComponent(k), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body: JSON.stringify(localEdits[k])
            }));
          }
        });
        cardDataCache.edits = edits;

        // Deleted defaults: union (deleting a default card is deliberate + idempotent)
        var deletedDefaults = serverDeletedDefaults.slice();
        localDeletedDefaults.forEach(function (id) {
          if (deletedDefaults.indexOf(id) === -1) deletedDefaults.push(id);
        });
        cardDataCache.deletedDefaults = deletedDefaults;

        // Push the tombstone union to the server (idempotent DELETE calls)
        cardDataCache.deletedCustoms = Object.keys(tombstone);
        cardDataCache.deletedCustoms.forEach(function (id) {
          if (serverDeletedCustoms.indexOf(id) === -1 && isAdmin && token) {
            syncPosts.push(fetch('/api/cards/' + encodeURIComponent(id), {
              method: 'DELETE',
              headers: { 'Authorization': 'Bearer ' + token }
            }));
          }
        });

        // Persist the reconciled, authoritative state locally so stale copies
        // never linger and re-infect the next load.
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalCustom));
          localStorage.setItem(LOCAL_EDITS_KEY, JSON.stringify(edits));
          localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify(deletedDefaults));
          localStorage.setItem(LOCAL_DELETED_CUSTOM_KEY, JSON.stringify(cardDataCache.deletedCustoms));
        } catch (_) {}

        Promise.all(syncPosts).then(function () {
          if (callback) callback();
        }).catch(function () {
          if (callback) callback();
        });
      })
      .catch(function (err) {
        console.error('Failed to load cards from server:', err);
        cardDataCache.customCards = getLocalCustomCards();
        cardDataCache.edits = getLocalEdits();
        cardDataCache.deletedDefaults = getLocalDeletedDefaults();
        cardDataCache.deletedCustoms = getLocalDeletedCustoms();
        if (callback) callback();
      });
  }

  function getCustomCards() {
    return cardDataCache.customCards;
  }

  function saveCustomCards(cards) {
    cardDataCache.customCards = cards;
    try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cards)); } catch (_) {}
  }

  function getCardEdits() {
    return cardDataCache.edits;
  }

  function saveEdit(cardId, data) {
    var isDefaultCard = cardId.indexOf('default-') === 0;

    if (isDefaultCard) {
      // Default cards: store the override in the edits map (matches the server)
      cardDataCache.edits[cardId] = data;
      try { localStorage.setItem(LOCAL_EDITS_KEY, JSON.stringify(cardDataCache.edits)); } catch (_) {}
    } else {
      // Custom cards: apply the change directly to the card object, never to the
      // edits map (stale per-card edits were overriding newer server data).
      var customCards = getCustomCards();
      for (var i = 0; i < customCards.length; i++) {
        if (customCards[i].id === cardId) {
          if (data.name !== undefined) customCards[i].name = data.name;
          if (data.url !== undefined) customCards[i].url = data.url;
          if (data.icon !== undefined) customCards[i].icon = data.icon;
          if (data.image !== undefined) customCards[i].image = data.image;
          break;
        }
      }
      saveCustomCards(customCards);
    }

    var token = sessionStorage.getItem('mzweb_token');
    if (!token) {
      showToast('Changes saved locally only. Login as admin to sync them to the server.', true);
      return;
    }
    function putEdit() {
      return fetch('/api/cards/' + encodeURIComponent(cardId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) showToast('Changes could not be synced to the server.', true);
      }).catch(function () {
        showToast('Changes could not be synced to the server.', true);
      });
    }
    if (pendingPosts[cardId]) {
      // Card was just added; wait for its POST to land before editing it
      pendingPosts[cardId].then(putEdit);
    } else {
      putEdit();
    }
  }

  // =====================
  // Card Rendering
  // =====================
  function renderCards() {
    if (!cardsLoaded) return;
    var container = document.getElementById('cardsContainer');
    var customCards = getCustomCards();
    var edits = getCardEdits();

    var allCards = [];
    var deletedDefaults = getDeletedDefaultIds();

    DEFAULT_CARDS.forEach(function (card) {
      if (deletedDefaults.indexOf(card.id) !== -1) return;
      var merged = {};
      for (var k in card) merged[k] = card[k];
      if (edits[card.id]) {
        for (var ek in edits[card.id]) merged[ek] = edits[card.id][ek];
      }
      merged.isDefault = true;
      allCards.push(merged);
    });

    customCards.forEach(function (card) {
      var merged = {};
      for (var k in card) merged[k] = card[k];
      // Only default cards may have edits applied; custom cards are edited in place
      if (card.id && card.id.indexOf('default-') === 0 && edits[card.id]) {
        for (var ek in edits[card.id]) merged[ek] = edits[card.id][ek];
      }
      allCards.push(merged);
    });
    if (searchQuery) {
      allCards = allCards.filter(function (card) {
        var nameMatch = card.name && card.name.toLowerCase().indexOf(searchQuery) !== -1;
        var urlMatch = card.url && card.url.toLowerCase().indexOf(searchQuery) !== -1;
        return nameMatch || urlMatch;
      });
    }

    container.innerHTML = '';

    if (allCards.length === 0) {
      if (searchQuery) {
        container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-secondary);font-size:0.9rem;"><i class="fas fa-magnifying-glass" style="font-size:2.5rem;display:block;margin-bottom:16px;opacity:0.4;"></i>No matching portals found for "' + escapeHtml(searchQuery) + '".</div>';
      } else {
        container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-secondary);font-size:0.9rem;"><i class="fas fa-folder-open" style="font-size:2.5rem;display:block;margin-bottom:16px;opacity:0.4;"></i>No websites yet. Admin can add websites.</div>';
      }
      return;
    }

    allCards.forEach(function (card, index) {
      var cardEl = document.createElement('div');
      cardEl.className = 'card';
      cardEl.setAttribute('data-url', card.url);

      var iconHtml = '';
      if (card.image) {
        iconHtml = '<img src="' + escapeHtml(card.image) + '" alt="' + escapeHtml(card.name) + '" style="width:100%;height:100%;object-fit:cover;border-radius:22px;" onerror="this.parentElement.innerHTML=\'<i class=\\\'fas fa-globe\\\'></i>\'">';
      } else {
        iconHtml = '<i class="fas ' + escapeHtml(card.icon || 'fa-globe') + '"></i>';
      }

      var actionsHtml = '';
      if (isAdmin) {
        actionsHtml += '<button class="card-edit-btn" data-id="' + card.id + '" title="Edit Website"><i class="fas fa-pen"></i></button>';
        actionsHtml += '<button class="card-delete-btn" data-id="' + card.id + '" title="Delete Website"><i class="fas fa-times"></i></button>';
      }

      cardEl.innerHTML =
        actionsHtml +
        '<div class="icon-wrapper">' + iconHtml + '</div>' +
        '<h3>' + escapeHtml(card.name) + '</h3>' +
        '<p>Click to open ' + escapeHtml(card.name) + '</p>' +
        '<button class="btn-open"><i class="fas fa-external-link-alt"></i> Open</button>';

      container.appendChild(cardEl);

      setTimeout(function () { cardEl.classList.add('visible'); }, index * 80);

      if (isAdmin) {
        var editBtn = cardEl.querySelector('.card-edit-btn');
        if (editBtn) {
          editBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var cardData = findCardData(card.id);
            if (cardData) openEditModal(cardData);
          });
        }
        var delBtn = cardEl.querySelector('.card-delete-btn');
        if (delBtn) {
          delBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            deleteCard(card.id);
          });
        }
      }

      cardEl.addEventListener('click', function (e) {
        if (e.target.closest('.btn-open') || e.target.closest('.card-edit-btn') || e.target.closest('.card-delete-btn')) return;
        navigate(card.url);
      });

      var openBtn = cardEl.querySelector('.btn-open');
      openBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        navigate(card.url);
      });
    });
  }

  function findCardData(id) {
    var edits = getCardEdits();
    for (var i = 0; i < DEFAULT_CARDS.length; i++) {
      if (DEFAULT_CARDS[i].id === id) {
        var merged = {};
        for (var k in DEFAULT_CARDS[i]) merged[k] = DEFAULT_CARDS[i][k];
        if (edits[id]) {
          for (var ek in edits[id]) merged[ek] = edits[id][ek];
        }
        return merged;
      }
    }
    var customCards = getCustomCards();
    for (var j = 0; j < customCards.length; j++) {
      if (customCards[j].id === id) {
        var m = {};
        for (var k2 in customCards[j]) m[k2] = customCards[j][k2];
        if (edits[id]) {
          for (var ek2 in edits[id]) m[ek2] = edits[id][ek2];
        }
        return m;
      }
    }
    return null;
  }

  function deleteCard(id) {
    if (confirm('Delete this website card?')) {
      var token = sessionStorage.getItem('mzweb_token');
      if (id && id.indexOf('default-') === 0) {
        saveDeletedDefaultId(id);
      } else {
        var customCards = getCustomCards();
        customCards = customCards.filter(function (c) { return c.id !== id; });
        saveCustomCards(customCards);

        // Record a local tombstone so this card never resurrects from stale
        // localStorage copies, even if this delete fails to reach the server now.
        var deletedCustoms = getLocalDeletedCustoms();
        if (deletedCustoms.indexOf(id) === -1) {
          deletedCustoms.push(id);
          try { localStorage.setItem(LOCAL_DELETED_CUSTOM_KEY, JSON.stringify(deletedCustoms)); } catch (_) {}
        }
        if (cardDataCache.deletedCustoms && cardDataCache.deletedCustoms.indexOf(id) === -1) {
          cardDataCache.deletedCustoms.push(id);
        }
        delete sessionAddedIds[id];

        if (token) {
          var delReq = function () {
            return fetch('/api/cards/' + encodeURIComponent(id), {
              method: 'DELETE',
              headers: { 'Authorization': 'Bearer ' + token }
            }).then(function (r) {
              if (!r.ok) showToast('Delete could not be synced to the server. It may reappear for other systems.', true);
            }).catch(function () {
              showToast('Delete could not be synced to the server. It may reappear for other systems.', true);
            });
          };
          if (pendingPosts[id]) {
            pendingPosts[id].then(delReq);
          } else {
            delReq();
          }
        }
      }
      renderCards();
    }
  }

  function navigate(url) {
    if (!url || url === '#') return;

    // Only hand the SSO token to same-system SSO pages (sso.html), never to
    // external websites - appending it to every URL broke external links.
    var token = sessionStorage.getItem('mzweb_token');
    if (token && url.indexOf('sso.html') !== -1) {
      var separator = url.indexOf('?') !== -1 ? '&' : '?';
      url = url + separator + 'token=' + encodeURIComponent(token);
    }

    window.location.href = url;
  }

  function showToast(message, isError) {
    var toast = document.getElementById('syncToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'syncToast';
      toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:12px 22px;border-radius:12px;font-family:Inter,system-ui,sans-serif;font-size:0.85rem;font-weight:600;color:#fff;box-shadow:0 12px 40px rgba(0,0,0,0.4);pointer-events:none;';
      document.body.appendChild(toast);
    }
    toast.style.background = isError ? '#dc2626' : '#059669';
    toast.textContent = message;
    if (showToast._timer) clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      showToast._timer = null;
    }, 6000);
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  loadDefaultCardsFromServer(function () {
    loadCardsFromServer(function () {
      cardsLoaded = true;
      renderCards();
    });
  });

  // Dynamic mouse tracking glow
  window.addEventListener('mousemove', function (e) {
    document.documentElement.style.setProperty('--mouse-x', e.clientX + 'px');
    document.documentElement.style.setProperty('--mouse-y', e.clientY + 'px');
  });
})();
