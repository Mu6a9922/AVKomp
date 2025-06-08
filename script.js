// Основная логика приложения

// Глобальные переменные
let editingId = null;
let currentEditingType = null;
let currentSortField = null;
let currentSortDirection = 'asc';

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    renderCurrentTab();
    updateStats();
});

// Инициализация приложения
function initializeApp() {
    // Проверяем поддержку localStorage
    if (!window.localStorage) {
        NotificationManager.error('Ваш браузер не поддерживает localStorage. Данные не будут сохраняться.');
    }
    
    // Инициализируем базу данных
    if (!db) {
        NotificationManager.error('Ошибка инициализации базы данных');
        return;
    }
    
    console.log('Приложение инициализировано');
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Поисковые поля
    const searchInputs = ['computerSearchInput', 'networkSearchInput', 'otherSearchInput', 'assignedSearchInput'];
    searchInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', debounce(() => filterCurrentTab(), 300));
        }
    });

    // Фильтры
    const filters = [
        'buildingFilter', 'typeFilter', 'statusFilter',
        'networkBuildingFilter', 'networkTypeFilter',
        'otherBuildingFilter', 'otherTypeFilter',
        'assignedBuildingFilter'
    ];
    filters.forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (filter) {
            filter.addEventListener('change', () => filterCurrentTab());
        }
    });

    // Формы
    setupFormListeners();

    // Закрытие модальных окон по клику вне их
    window.addEventListener('click', function(event) {
        const modals = ['computerModal', 'networkModal', 'otherModal', 'assignedModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (event.target === modal) {
                closeModal(modalId);
            }
        });
    });

    // Обработчик для поиска по инвентарному номеру
    const inventorySearchInput = document.getElementById('inventorySearchInput');
    if (inventorySearchInput) {
        inventorySearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchByInventoryNumber();
            }
        });
    }

    // Обработчик для поиска устройства при назначении
    const deviceSearchInput = document.getElementById('deviceSearchInput');
    if (deviceSearchInput) {
        deviceSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchDeviceByInventoryNumber();
            }
        });
    }
}

// Настройка обработчиков форм
function setupFormListeners() {
    // Форма компьютеров
    const computerForm = document.getElementById('computerForm');
    if (computerForm) {
        computerForm.addEventListener('submit', handleComputerSubmit);
    }

    // Форма сетевых устройств
    const networkForm = document.getElementById('networkForm');
    if (networkForm) {
        networkForm.addEventListener('submit', handleNetworkSubmit);
    }

    // Форма другой техники
    const otherForm = document.getElementById('otherForm');
    if (otherForm) {
        otherForm.addEventListener('submit', handleOtherSubmit);
    }

    // Форма назначенных устройств
    const assignedForm = document.getElementById('assignedForm');
    if (assignedForm) {
        assignedForm.addEventListener('submit', handleAssignedSubmit);
    }
}

// Debounce функция для оптимизации поиска
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Обновление статистики
function updateStats() {
    const stats = db.getStats();
    document.getElementById('totalComputers').textContent = stats.computers;
    document.getElementById('totalNetwork').textContent = stats.network;
    document.getElementById('totalOther').textContent = stats.other;
    document.getElementById('totalAssigned').textContent = stats.assigned;
}

// Переключение вкладок
function openTab(evt, tabName) {
    // Скрываем все вкладки
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
    }
    
    // Убираем активный класс с кнопок
    const tabButtons = document.getElementsByClassName("tab-button");
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove("active");
    }
    
    // Показываем выбранную вкладку
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
    
    // Отображаем данные для выбранной вкладки
    renderTabContent(tabName);
}

// Отображение содержимого вкладки
function renderTabContent(tabName) {
    switch(tabName) {
        case 'computers':
            filterComputers();
            break;
        case 'network':
            filterNetworkDevices();
            break;
        case 'other':
            filterOtherDevices();
            break;
        case 'assigned':
            filterAssignedDevices();
            break;
    }
}

// Отображение текущей активной вкладки
function renderCurrentTab() {
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
        renderTabContent(activeTab.id);
    }
}

// Фильтрация текущей активной вкладки
function filterCurrentTab() {
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
        renderTabContent(activeTab.id);
    }
}

// === РАБОТА С КОМПЬЮТЕРАМИ ===

function renderComputerTable(data = null) {
    const computers = data || db.getByType('computers');
    const tbody = document.getElementById('computerTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    computers.forEach((computer, index) => {
        const statusClass = StatusManager.getStatusClass(computer.status);
        const statusText = StatusManager.getStatusText(computer.status);

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${StringUtils.escapeHtml(computer.inventoryNumber)}</strong></td>
                <td>${StringUtils.escapeHtml(computer.building)}</td>
                <td>${StringUtils.escapeHtml(computer.location)}</td>
                <td>${StringUtils.escapeHtml(computer.deviceType)}</td>
                <td>${StringUtils.escapeHtml(computer.model || '')}</td>
                <td>${StringUtils.escapeHtml(computer.processor || '')}</td>
                <td>${StringUtils.escapeHtml(computer.ram || '')}</td>
                <td>${StringUtils.escapeHtml(computer.ipAddress || '')}</td>
                <td>${StringUtils.escapeHtml(computer.computerName || '')}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn" onclick="editComputer(${computer.id})" style="font-size: 12px; padding: 5px 10px;" title="Редактировать">✏️</button>
                    <button class="btn btn-danger" onclick="deleteComputer(${computer.id})" style="font-size: 12px; padding: 5px 10px; margin-left: 5px;" title="Удалить">🗑️</button>
                </td>
            </tr>
        `;
    });
}

function filterComputers() {
    const searchTerm = document.getElementById('computerSearchInput')?.value || '';
    const buildingFilter = document.getElementById('buildingFilter')?.value || '';
    const typeFilter = document.getElementById('typeFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';

    let computers = db.getByType('computers');

    // Поиск
    if (searchTerm) {
        computers = FilterManager.filterBySearch(computers, searchTerm, [
            'inventoryNumber', 'location', 'model', 'computerName', 'processor', 'ram'
        ]);
    }

    // Фильтры
    const filters = {};
    if (buildingFilter) filters.building = buildingFilter;
    if (typeFilter) filters.deviceType = typeFilter;
    if (statusFilter) filters.status = statusFilter;

    computers = FilterManager.filterByFilters(computers, filters);

    renderComputerTable(computers);
}

function openComputerModal() {
    editingId = null;
    currentEditingType = 'computer';
    document.getElementById('computerModalTitle').textContent = 'Добавить компьютер';
    FormManager.clearForm('computerForm');
    
    // Сбрасываем состояние поиска
    resetInventorySearch();
    
    document.getElementById('computerModal').style.display = 'block';
}

function editComputer(id) {
    const computer = db.getByType('computers').find(c => c.id === id);
    if (!computer) {
        NotificationManager.error('Компьютер не найден');
        return;
    }

    editingId = id;
    currentEditingType = 'computer';
    document.getElementById('computerModalTitle').textContent = 'Редактировать компьютер';
    
    // Заполняем форму
    document.getElementById('computerInventoryNumber').value = computer.inventoryNumber || '';
    document.getElementById('computerBuilding').value = computer.building || '';
    document.getElementById('computerLocation').value = computer.location || '';
    document.getElementById('computerDeviceType').value = computer.deviceType || '';
    document.getElementById('computerModel').value = computer.model || '';
    document.getElementById('computerProcessor').value = computer.processor || '';
    document.getElementById('computerRam').value = computer.ram || '';
    document.getElementById('computerStorage').value = computer.storage || '';
    document.getElementById('computerGraphics').value = computer.graphics || '';
    document.getElementById('computerIpAddress').value = computer.ipAddress || '';
    document.getElementById('computerName').value = computer.computerName || '';
    document.getElementById('computerYear').value = computer.year || '';
    document.getElementById('computerNotes').value = computer.notes || '';

    // Сбрасываем состояние поиска
    resetInventorySearch();

    document.getElementById('computerModal').style.display = 'block';
}

function deleteComputer(id) {
    if (confirm('Вы уверены, что хотите удалить этот компьютер?')) {
        if (db.delete('computers', id)) {
            NotificationManager.success('Компьютер успешно удален');
            filterComputers();
            updateStats();
        } else {
            NotificationManager.error('Ошибка при удалении компьютера');
        }
    }
}

function handleComputerSubmit(e) {
    e.preventDefault();

    // Собираем данные формы
    const formData = {
        inventoryNumber: document.getElementById('computerInventoryNumber').value.trim(),
        building: document.getElementById('computerBuilding').value,
        location: document.getElementById('computerLocation').value.trim(),
        deviceType: document.getElementById('computerDeviceType').value,
        model: document.getElementById('computerModel').value.trim(),
        processor: document.getElementById('computerProcessor').value.trim(),
        ram: document.getElementById('computerRam').value.trim(),
        storage: document.getElementById('computerStorage').value.trim(),
        graphics: document.getElementById('computerGraphics').value.trim(),
        ipAddress: document.getElementById('computerIpAddress').value.trim(),
        computerName: document.getElementById('computerName').value.trim(),
        year: document.getElementById('computerYear').value.trim(),
        notes: document.getElementById('computerNotes').value.trim()
    };

    // Валидация
    const validationRules = {
        inventoryNumber: { required: true, message: 'Инвентарный номер обязателен' },
        building: { required: true, message: 'Корпус обязателен' },
        location: { required: true, message: 'Расположение обязательно' },
        deviceType: { required: true, message: 'Тип устройства обязателен' }
    };

    const validation = FormManager.validateForm('computerForm', validationRules);
    if (!validation.valid) {
        NotificationManager.error(validation.errors.join('\n'));
        return;
    }

    // Проверка IP адреса
    if (formData.ipAddress && !Validator.isValidIP(formData.ipAddress)) {
        NotificationManager.warning('IP-адрес имеет неверный формат');
    }

    // Определяем статус
    formData.status = StatusManager.getStatus(formData.notes);

    try {
        if (editingId && currentEditingType === 'computer') {
            // Обновление
            if (db.update('computers', editingId, formData)) {
                NotificationManager.success('Компьютер успешно обновлен');
            } else {
                NotificationManager.error('Ошибка при обновлении компьютера');
                return;
            }
        } else {
            // Добавление
            if (db.add('computers', formData)) {
                NotificationManager.success('Компьютер успешно добавлен');
            } else {
                NotificationManager.error('Ошибка при добавлении компьютера');
                return;
            }
        }

        filterComputers();
        updateStats();
        closeModal('computerModal');
    } catch (error) {
        NotificationManager.error('Произошла ошибка: ' + error.message);
    }
}

// === РАБОТА С СЕТЕВЫМ ОБОРУДОВАНИЕМ ===

function renderNetworkTable(data = null) {
    const devices = data || db.getByType('networkDevices');
    const tbody = document.getElementById('networkTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    devices.forEach((device, index) => {
        const statusClass = StatusManager.getStatusClass(device.status);
        const statusText = StatusManager.getStatusText(device.status);

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${StringUtils.escapeHtml(device.type)}</td>
                <td>${StringUtils.escapeHtml(device.model)}</td>
                <td>${StringUtils.escapeHtml(device.building)}</td>
                <td>${StringUtils.escapeHtml(device.location)}</td>
                <td>${StringUtils.escapeHtml(device.ipAddress)}</td>
                <td>${StringUtils.escapeHtml(device.login || '')}</td>
                <td>${StringUtils.escapeHtml(device.wifiName || '')}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn" onclick="editNetworkDevice(${device.id})" style="font-size: 12px; padding: 5px 10px;" title="Редактировать">✏️</button>
                    <button class="btn btn-danger" onclick="deleteNetworkDevice(${device.id})" style="font-size: 12px; padding: 5px 10px; margin-left: 5px;" title="Удалить">🗑️</button>
                </td>
            </tr>
        `;
    });
}

function filterNetworkDevices() {
    const searchTerm = document.getElementById('networkSearchInput')?.value || '';
    const buildingFilter = document.getElementById('networkBuildingFilter')?.value || '';
    const typeFilter = document.getElementById('networkTypeFilter')?.value || '';

    let devices = db.getByType('networkDevices');

    // Поиск
    if (searchTerm) {
        devices = FilterManager.filterBySearch(devices, searchTerm, [
            'model', 'location', 'ipAddress', 'wifiName', 'login'
        ]);
    }

    // Фильтры
    const filters = {};
    if (buildingFilter) filters.building = buildingFilter;
    if (typeFilter) filters.type = typeFilter;

    devices = FilterManager.filterByFilters(devices, filters);

    renderNetworkTable(devices);
}

function openNetworkModal() {
    editingId = null;
    currentEditingType = 'network';
    document.getElementById('networkModalTitle').textContent = 'Добавить сетевое устройство';
    FormManager.clearForm('networkForm');
    document.getElementById('networkModal').style.display = 'block';
}

function editNetworkDevice(id) {
    const device = db.getByType('networkDevices').find(d => d.id === id);
    if (!device) {
        NotificationManager.error('Устройство не найдено');
        return;
    }

    editingId = id;
    currentEditingType = 'network';
    document.getElementById('networkModalTitle').textContent = 'Редактировать сетевое устройство';
    
    // Заполняем форму
    document.getElementById('networkType').value = device.type || '';
    document.getElementById('networkModel').value = device.model || '';
    document.getElementById('networkBuilding').value = device.building || '';
    document.getElementById('networkLocation').value = device.location || '';
    document.getElementById('networkIpAddress').value = device.ipAddress || '';
    document.getElementById('networkLogin').value = device.login || '';
    document.getElementById('networkPassword').value = device.password || '';
    document.getElementById('networkWifiName').value = device.wifiName || '';
    document.getElementById('networkWifiPassword').value = device.wifiPassword || '';
    document.getElementById('networkNotes').value = device.notes || '';

    document.getElementById('networkModal').style.display = 'block';
}

function deleteNetworkDevice(id) {
    if (confirm('Вы уверены, что хотите удалить это сетевое устройство?')) {
        if (db.delete('networkDevices', id)) {
            NotificationManager.success('Сетевое устройство успешно удалено');
            filterNetworkDevices();
            updateStats();
        } else {
            NotificationManager.error('Ошибка при удалении сетевого устройства');
        }
    }
}

function handleNetworkSubmit(e) {
    e.preventDefault();

    const formData = {
        type: document.getElementById('networkType').value,
        model: document.getElementById('networkModel').value.trim(),
        building: document.getElementById('networkBuilding').value,
        location: document.getElementById('networkLocation').value.trim(),
        ipAddress: document.getElementById('networkIpAddress').value.trim(),
        login: document.getElementById('networkLogin').value.trim(),
        password: document.getElementById('networkPassword').value.trim(),
        wifiName: document.getElementById('networkWifiName').value.trim(),
        wifiPassword: document.getElementById('networkWifiPassword').value.trim(),
        notes: document.getElementById('networkNotes').value.trim()
    };

    // Валидация
    const validationRules = {
        type: { required: true, message: 'Тип устройства обязателен' },
        model: { required: true, message: 'Модель обязательна' },
        building: { required: true, message: 'Корпус обязателен' },
        location: { required: true, message: 'Расположение обязательно' },
        ipAddress: { required: true, message: 'IP-адрес обязателен' }
    };

    const validation = FormManager.validateForm('networkForm', validationRules);
    if (!validation.valid) {
        NotificationManager.error(validation.errors.join('\n'));
        return;
    }

    // Проверка IP адреса
    if (!Validator.isValidIP(formData.ipAddress)) {
        NotificationManager.error('IP-адрес имеет неверный формат');
        return;
    }

    formData.status = StatusManager.getStatus(formData.notes);

    try {
        if (editingId && currentEditingType === 'network') {
            if (db.update('networkDevices', editingId, formData)) {
                NotificationManager.success('Сетевое устройство успешно обновлено');
            } else {
                NotificationManager.error('Ошибка при обновлении сетевого устройства');
                return;
            }
        } else {
            if (db.add('networkDevices', formData)) {
                NotificationManager.success('Сетевое устройство успешно добавлено');
            } else {
                NotificationManager.error('Ошибка при добавлении сетевого устройства');
                return;
            }
        }

        filterNetworkDevices();
        updateStats();
        closeModal('networkModal');
    } catch (error) {
        NotificationManager.error('Произошла ошибка: ' + error.message);
    }
}

// === РАБОТА С ДРУГОЙ ТЕХНИКОЙ ===

function renderOtherTable(data = null) {
    const devices = data || db.getByType('otherDevices');
    const tbody = document.getElementById('otherTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    devices.forEach((device, index) => {
        const statusClass = StatusManager.getStatusClass(device.status);
        const statusText = StatusManager.getStatusText(device.status);

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${StringUtils.escapeHtml(device.type)}</td>
                <td>${StringUtils.escapeHtml(device.model)}</td>
                <td>${StringUtils.escapeHtml(device.building)}</td>
                <td>${StringUtils.escapeHtml(device.location)}</td>
                <td>${StringUtils.escapeHtml(device.responsible || '')}</td>
                <td>${StringUtils.escapeHtml(device.inventoryNumber || '')}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn" onclick="editOtherDevice(${device.id})" style="font-size: 12px; padding: 5px 10px;" title="Редактировать">✏️</button>
                    <button class="btn btn-danger" onclick="deleteOtherDevice(${device.id})" style="font-size: 12px; padding: 5px 10px; margin-left: 5px;" title="Удалить">🗑️</button>
                </td>
            </tr>
        `;
    });
}

function filterOtherDevices() {
    const searchTerm = document.getElementById('otherSearchInput')?.value || '';
    const buildingFilter = document.getElementById('otherBuildingFilter')?.value || '';
    const typeFilter = document.getElementById('otherTypeFilter')?.value || '';

    let devices = db.getByType('otherDevices');

    // Поиск
    if (searchTerm) {
        devices = FilterManager.filterBySearch(devices, searchTerm, [
            'model', 'location', 'responsible', 'inventoryNumber', 'type'
        ]);
    }

    // Фильтры
    const filters = {};
    if (buildingFilter) filters.building = buildingFilter;
    if (typeFilter) filters.type = typeFilter;

    devices = FilterManager.filterByFilters(devices, filters);

    renderOtherTable(devices);
}

function openOtherModal() {
    editingId = null;
    currentEditingType = 'other';
    document.getElementById('otherModalTitle').textContent = 'Добавить устройство';
    FormManager.clearForm('otherForm');
    document.getElementById('otherModal').style.display = 'block';
}

function editOtherDevice(id) {
    const device = db.getByType('otherDevices').find(d => d.id === id);
    if (!device) {
        NotificationManager.error('Устройство не найдено');
        return;
    }

    editingId = id;
    currentEditingType = 'other';
    document.getElementById('otherModalTitle').textContent = 'Редактировать устройство';
    
    // Заполняем форму
    document.getElementById('otherType').value = device.type || '';
    document.getElementById('otherModel').value = device.model || '';
    document.getElementById('otherBuilding').value = device.building || '';
    document.getElementById('otherLocation').value = device.location || '';
    document.getElementById('otherResponsible').value = device.responsible || '';
    document.getElementById('otherInventoryNumber').value = device.inventoryNumber || '';
    document.getElementById('otherNotes').value = device.notes || '';

    document.getElementById('otherModal').style.display = 'block';
}

function deleteOtherDevice(id) {
    if (confirm('Вы уверены, что хотите удалить это устройство?')) {
        if (db.delete('otherDevices', id)) {
            NotificationManager.success('Устройство успешно удалено');
            filterOtherDevices();
            updateStats();
        } else {
            NotificationManager.error('Ошибка при удалении устройства');
        }
    }
}

function handleOtherSubmit(e) {
    e.preventDefault();

    const formData = {
        type: document.getElementById('otherType').value,
        model: document.getElementById('otherModel').value.trim(),
        building: document.getElementById('otherBuilding').value,
        location: document.getElementById('otherLocation').value.trim(),
        responsible: document.getElementById('otherResponsible').value.trim(),
        inventoryNumber: document.getElementById('otherInventoryNumber').value.trim(),
        notes: document.getElementById('otherNotes').value.trim()
    };

    // Валидация
    const validationRules = {
        type: { required: true, message: 'Тип устройства обязателен' },
        model: { required: true, message: 'Модель обязательна' },
        building: { required: true, message: 'Корпус обязателен' },
        location: { required: true, message: 'Расположение обязательно' }
    };

    const validation = FormManager.validateForm('otherForm', validationRules);
    if (!validation.valid) {
        NotificationManager.error(validation.errors.join('\n'));
        return;
    }

    formData.status = StatusManager.getStatus(formData.notes);

    try {
        if (editingId && currentEditingType === 'other') {
            if (db.update('otherDevices', editingId, formData)) {
                NotificationManager.success('Устройство успешно обновлено');
            } else {
                NotificationManager.error('Ошибка при обновлении устройства');
                return;
            }
        } else {
            if (db.add('otherDevices', formData)) {
                NotificationManager.success('Устройство успешно добавлено');
            } else {
                NotificationManager.error('Ошибка при добавлении устройства');
                return;
            }
        }

        filterOtherDevices();
        updateStats();
        closeModal('otherModal');
    } catch (error) {
        NotificationManager.error('Произошла ошибка: ' + error.message);
    }
}

// === РАБОТА С НАЗНАЧЕННЫМИ УСТРОЙСТВАМИ ===

function renderAssignedTable(data = null) {
    const assignments = data || db.getByType('assignedDevices');
    const tbody = document.getElementById('assignedTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    assignments.forEach((assignment, index) => {
        const devicesHtml = assignment.devices.map(device => 
            `<div class="device-item">${StringUtils.escapeHtml(device)}</div>`
        ).join('');

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${StringUtils.escapeHtml(assignment.employee)}</strong></td>
                <td>${StringUtils.escapeHtml(assignment.position)}</td>
                <td>${StringUtils.escapeHtml(assignment.building)}</td>
                <td><div class="device-list">${devicesHtml}</div></td>
                <td>${DateUtils.formatDate(assignment.assignedDate)}</td>
                <td>
                    <button class="btn" onclick="editAssignedDevice(${assignment.id})" style="font-size: 12px; padding: 5px 10px;" title="Редактировать">✏️</button>
                    <button class="btn btn-danger" onclick="deleteAssignedDevice(${assignment.id})" style="font-size: 12px; padding: 5px 10px; margin-left: 5px;" title="Удалить">🗑️</button>
                </td>
            </tr>
        `;
    });
}

function filterAssignedDevices() {
    const searchTerm = document.getElementById('assignedSearchInput')?.value || '';
    const buildingFilter = document.getElementById('assignedBuildingFilter')?.value || '';

    let assignments = db.getByType('assignedDevices');

    // Поиск
    if (searchTerm) {
        assignments = assignments.filter(assignment => {
            const searchFields = [
                assignment.employee,
                assignment.position,
                assignment.devices.join(' ')
            ];
            return searchFields.some(field => 
                field.toLowerCase().includes(searchTerm.toLowerCase())
            );
        });
    }

    // Фильтры
    if (buildingFilter) {
        assignments = assignments.filter(assignment => assignment.building === buildingFilter);
    }

    renderAssignedTable(assignments);
}

function openAssignedModal() {
    editingId = null;
    currentEditingType = 'assigned';
    document.getElementById('assignedModalTitle').textContent = 'Назначить устройство сотруднику';
    FormManager.clearForm('assignedForm');
    
    // Устанавливаем текущую дату
    document.getElementById('assignedDate').value = DateUtils.getCurrentDate();
    
    // Сбрасываем состояние поиска устройства
    resetDeviceSearch();
    
    document.getElementById('assignedModal').style.display = 'block';
}

function editAssignedDevice(id) {
    const assignment = db.getByType('assignedDevices').find(a => a.id === id);
    if (!assignment) {
        NotificationManager.error('Назначение не найдено');
        return;
    }

    editingId = id;
    currentEditingType = 'assigned';
    document.getElementById('assignedModalTitle').textContent = 'Редактировать назначение';
    
    // Заполняем форму
    document.getElementById('assignedEmployee').value = assignment.employee || '';
    document.getElementById('assignedPosition').value = assignment.position || '';
    document.getElementById('assignedBuilding').value = assignment.building || '';
    document.getElementById('assignedDate').value = assignment.assignedDate || '';
    document.getElementById('assignedDevices').value = assignment.devices.join('\n');
    document.getElementById('assignedNotes').value = assignment.notes || '';

    // Сбрасываем состояние поиска устройства
    resetDeviceSearch();

    document.getElementById('assignedModal').style.display = 'block';
}

function deleteAssignedDevice(id) {
    if (confirm('Вы уверены, что хотите удалить это назначение?')) {
        if (db.delete('assignedDevices', id)) {
            NotificationManager.success('Назначение успешно удалено');
            filterAssignedDevices();
            updateStats();
        } else {
            NotificationManager.error('Ошибка при удалении назначения');
        }
    }
}

function handleAssignedSubmit(e) {
    e.preventDefault();

    const devicesText = document.getElementById('assignedDevices').value.trim();
    const devicesArray = devicesText.split('\n').filter(line => line.trim() !== '');

    if (devicesArray.length === 0) {
        NotificationManager.error('Необходимо указать хотя бы одно устройство');
        return;
    }

    const formData = {
        employee: document.getElementById('assignedEmployee').value.trim(),
        position: document.getElementById('assignedPosition').value.trim(),
        building: document.getElementById('assignedBuilding').value,
        devices: devicesArray,
        assignedDate: document.getElementById('assignedDate').value,
        notes: document.getElementById('assignedNotes').value.trim()
    };

    // Валидация
    const validationRules = {
        employee: { required: true, message: 'ФИО сотрудника обязательно' },
        position: { required: true, message: 'Должность обязательна' },
        building: { required: true, message: 'Корпус обязателен' },
        assignedDate: { required: true, message: 'Дата назначения обязательна' }
    };

    const validation = FormManager.validateForm('assignedForm', validationRules);
    if (!validation.valid) {
        NotificationManager.error(validation.errors.join('\n'));
        return;
    }

    // Проверка даты
    if (!Validator.isValidDate(formData.assignedDate)) {
        NotificationManager.error('Неверный формат даты');
        return;
    }

    try {
        if (editingId && currentEditingType === 'assigned') {
            if (db.update('assignedDevices', editingId, formData)) {
                NotificationManager.success('Назначение успешно обновлено');
            } else {
                NotificationManager.error('Ошибка при обновлении назначения');
                return;
            }
        } else {
            if (db.add('assignedDevices', formData)) {
                NotificationManager.success('Назначение успешно создано');
            } else {
                NotificationManager.error('Ошибка при создании назначения');
                return;
            }
        }

        filterAssignedDevices();
        updateStats();
        closeModal('assignedModal');
    } catch (error) {
        NotificationManager.error('Произошла ошибка: ' + error.message);
    }
}

// === ПОИСК ПО ИНВЕНТАРНОМУ НОМЕРУ ===

function searchByInventoryNumber() {
    const inventoryNumber = document.getElementById('inventorySearchInput')?.value?.trim();
    if (!inventoryNumber) {
        NotificationManager.warning('Введите инвентарный номер');
        return;
    }

    const result = db.findByInventoryNumber(inventoryNumber);
    const searchBox = document.getElementById('inventorySearchBox');
    const infoElement = document.getElementById('autoFillInfo');

    if (result) {
        // Найдено устройство
        searchBox.className = 'inventory-search inventory-found';
        infoElement.textContent = `✅ Найдено: ${result.data.model || result.data.type || 'Устройство'}`;
        
        // Автозаполнение формы
        fillComputerFormFromData(result.data);
        
        NotificationManager.success('Устройство найдено и данные заполнены автоматически');
    } else {
        // Не найдено
        searchBox.className = 'inventory-search inventory-not-found';
        infoElement.textContent = `❌ Устройство с номером "${inventoryNumber}" не найдено в базе данных`;
        
        // Заполняем только инвентарный номер
        document.getElementById('computerInventoryNumber').value = inventoryNumber;
        
        NotificationManager.warning('Устройство не найдено в базе данных');
    }
}

function fillComputerFormFromData(data) {
    // Заполняем поля формы данными из найденного устройства
    document.getElementById('computerInventoryNumber').value = data.inventoryNumber || '';
    document.getElementById('computerLocation').value = data.location || '';
    document.getElementById('computerDeviceType').value = data.deviceType || '';
    document.getElementById('computerModel').value = data.model || '';
    document.getElementById('computerProcessor').value = data.processor || '';
    document.getElementById('computerRam').value = data.ram || '';
    document.getElementById('computerStorage').value = data.storage || '';
    document.getElementById('computerGraphics').value = data.graphics || '';
    document.getElementById('computerYear').value = data.year || '';
    
    // Определяем корпус
    if (data.building) {
        document.getElementById('computerBuilding').value = data.building;
    } else {
        // Автоопределение корпуса по расположению
        const building = db.determineBuilding(data.location || '');
        document.getElementById('computerBuilding').value = building;
    }
}

function resetInventorySearch() {
    const searchBox = document.getElementById('inventorySearchBox');
    const infoElement = document.getElementById('autoFillInfo');
    const searchInput = document.getElementById('inventorySearchInput');
    
    if (searchBox) searchBox.className = 'inventory-search';
    if (infoElement) infoElement.textContent = 'Введите инвентарный номер и нажмите "Найти" для автоматического заполнения полей';
    if (searchInput) searchInput.value = '';
}

// === ПОИСК УСТРОЙСТВА ДЛЯ НАЗНАЧЕНИЯ ===

function searchDeviceByInventoryNumber() {
    const inventoryNumber = document.getElementById('deviceSearchInput')?.value?.trim();
    if (!inventoryNumber) {
        NotificationManager.warning('Введите инвентарный номер устройства');
        return;
    }

    const result = db.findByInventoryNumber(inventoryNumber);
    const searchBox = document.getElementById('deviceSearchBox');
    const infoElement = document.getElementById('deviceAutoFillInfo');

    if (result) {
        // Найдено устройство
        searchBox.className = 'inventory-search inventory-found';
        const deviceInfo = `${result.data.deviceType || result.data.type || 'Устройство'} ${result.data.model || ''} (${inventoryNumber})`;
        infoElement.textContent = `✅ Найдено: ${deviceInfo}`;
        
        // Добавляем устройство в текстовое поле
        const devicesTextarea = document.getElementById('assignedDevices');
        const currentDevices = devicesTextarea.value.trim();
        const newDevice = deviceInfo.trim();
        
        if (currentDevices) {
            devicesTextarea.value = currentDevices + '\n' + newDevice;
        } else {
            devicesTextarea.value = newDevice;
        }
        
        // Очищаем поле поиска
        document.getElementById('deviceSearchInput').value = '';
        
        NotificationManager.success('Устройство добавлено в список');
    } else {
        // Не найдено
        searchBox.className = 'inventory-search inventory-not-found';
        infoElement.textContent = `❌ Устройство с номером "${inventoryNumber}" не найдено`;
        
        NotificationManager.warning('Устройство не найдено в базе данных');
    }
}

function resetDeviceSearch() {
    const searchBox = document.getElementById('deviceSearchBox');
    const infoElement = document.getElementById('deviceAutoFillInfo');
    const searchInput = document.getElementById('deviceSearchInput');
    
    if (searchBox) searchBox.className = 'inventory-search';
    if (infoElement) infoElement.textContent = 'Поиск устройства по инвентарному номеру для быстрого добавления';
    if (searchInput) searchInput.value = '';
}

// === ИМПОРТ И ЭКСПОРТ ===

async function importComputers(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        NotificationManager.info('Начинается импорт данных...');
        
        const excelData = await ExcelManager.readExcelFile(file);
        const result = db.importFromExcel(excelData);
        
        if (result.success) {
            NotificationManager.success(`Успешно импортировано ${result.count} записей`);
            filterComputers();
            updateStats();
        } else {
            NotificationManager.error('Ошибка при импорте: ' + result.error);
        }
    } catch (error) {
        NotificationManager.error('Ошибка при чтении файла: ' + error.message);
    }
    
    // Сбрасываем значение input для возможности повторного выбора того же файла
    event.target.value = '';
}

function exportToExcel(type) {
    try {
        const data = db.exportToExcel(type);
        if (data.length === 0) {
            NotificationManager.warning('Нет данных для экспорта');
            return;
        }

        const typeNames = {
            computers: 'компьютеры',
            network: 'сетевое_оборудование',
            other: 'другая_техника',
            assigned: 'назначенные_устройства'
        };

        const filename = `${typeNames[type]}_${DateUtils.getCurrentDate()}.xlsx`;
        
        if (ExcelManager.downloadExcel(data, filename)) {
            NotificationManager.success(`Данные успешно экспортированы в файл ${filename}`);
        } else {
            NotificationManager.error('Ошибка при экспорте данных');
        }
    } catch (error) {
        NotificationManager.error('Ошибка при экспорте: ' + error.message);
    }
}

function exportData(type) {
    try {
        const data = db.getByType(type);
        if (data.length === 0) {
            NotificationManager.warning('Нет данных для экспорта');
            return;
        }

        const typeNames = {
            computers: 'компьютеры',
            networkDevices: 'сетевое_оборудование',
            otherDevices: 'другая_техника',
            assignedDevices: 'назначенные_устройства'
        };

        const filename = `${typeNames[type] || type}_${DateUtils.getCurrentDate()}.json`;
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        
        NotificationManager.success(`Данные успешно экспортированы в файл ${filename}`);
    } catch (error) {
        NotificationManager.error('Ошибка при экспорте: ' + error.message);
    }
}

// === МОДАЛЬНЫЕ ОКНА ===

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Сбрасываем глобальные переменные
    editingId = null;
    currentEditingType = null;
    
    // Сбрасываем состояние поиска
    resetInventorySearch();
    resetDeviceSearch();
}

// === ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ===

// Функция для создания резервной копии
function createBackup() {
    try {
        db.backup();
        NotificationManager.success('Резервная копия успешно создана');
    } catch (error) {
        NotificationManager.error('Ошибка при создании резервной копии: ' + error.message);
    }
}

// Функция для восстановления из резервной копии
function restoreFromBackup(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backupData = e.target.result;
            if (db.restore(backupData)) {
                NotificationManager.success('Данные успешно восстановлены из резервной копии');
                renderCurrentTab();
                updateStats();
            } else {
                NotificationManager.error('Ошибка при восстановлении данных');
            }
        } catch (error) {
            NotificationManager.error('Ошибка при чтении файла резервной копии: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Функция для очистки всех данных
function clearAllData() {
    if (confirm('Вы уверены, что хотите удалить ВСЕ данные? Это действие необратимо!')) {
        if (confirm('Последнее предупреждение! Все данные будут удалены безвозвратно!')) {
            try {
                localStorage.removeItem(db.storageKey);
                location.reload();
            } catch (error) {
                NotificationManager.error('Ошибка при очистке данных: ' + error.message);
            }
        }
    }
}

// Функция для получения статистики по статусам
function getStatusStatistics() {
    const computers = db.getByType('computers');
    const networkDevices = db.getByType('networkDevices');
    const otherDevices = db.getByType('otherDevices');
    
    const allDevices = [...computers, ...networkDevices, ...otherDevices];
    
    const stats = {
        working: 0,
        issues: 0,
        broken: 0,
        total: allDevices.length
    };
    
    allDevices.forEach(device => {
        if (device.status) {
            stats[device.status]++;
        } else {
            stats.working++;
        }
    });
    
    return stats;
}

// Функция для отображения статистики по статусам
function showStatusStatistics() {
    const stats = getStatusStatistics();
    const message = `
Статистика по состоянию оборудования:
• Исправные: ${stats.working}
• С проблемами: ${stats.issues}
• Неисправные: ${stats.broken}
• Всего устройств: ${stats.total}
    `;
    
    alert(message);
}

// Функция для поиска дубликатов инвентарных номеров
function findDuplicateInventoryNumbers() {
    const computers = db.getByType('computers');
    const otherDevices = db.getByType('otherDevices');
    
    const allDevices = [...computers, ...otherDevices];
    const inventoryNumbers = {};
    const duplicates = [];
    
    allDevices.forEach(device => {
        const number = device.inventoryNumber;
        if (number && number.trim() !== '') {
            if (inventoryNumbers[number]) {
                duplicates.push(number);
            } else {
                inventoryNumbers[number] = true;
            }
        }
    });
    
    if (duplicates.length > 0) {
        NotificationManager.warning(`Найдены дублирующиеся инвентарные номера: ${duplicates.join(', ')}`);
    } else {
        NotificationManager.success('Дублирующиеся инвентарные номера не найдены');
    }
    
    return duplicates;
}

// Функция для валидации IP-адресов
function validateAllIPAddresses() {
    const computers = db.getByType('computers');
    const networkDevices = db.getByType('networkDevices');
    
    const invalidIPs = [];
    
    computers.forEach(computer => {
        if (computer.ipAddress && !Validator.isValidIP(computer.ipAddress)) {
            invalidIPs.push({
                type: 'Компьютер',
                name: computer.inventoryNumber || computer.model,
                ip: computer.ipAddress
            });
        }
    });
    
    networkDevices.forEach(device => {
        if (device.ipAddress && !Validator.isValidIP(device.ipAddress)) {
            invalidIPs.push({
                type: 'Сетевое устройство',
                name: device.model,
                ip: device.ipAddress
            });
        }
    });
    
    if (invalidIPs.length > 0) {
        const message = 'Найдены некорректные IP-адреса:\n' + 
            invalidIPs.map(item => `• ${item.type}: ${item.name} - ${item.ip}`).join('\n');
        NotificationManager.warning(message);
    } else {
        NotificationManager.success('Все IP-адреса корректны');
    }
    
    return invalidIPs;
}

// Функция для автоматического определения статуса
function recalculateAllStatuses() {
    try {
        let updatedCount = 0;
        
        // Обновляем статусы компьютеров
        const computers = db.getByType('computers');
        computers.forEach(computer => {
            const newStatus = StatusManager.getStatus(computer.notes);
            if (computer.status !== newStatus) {
                computer.status = newStatus;
                updatedCount++;
            }
        });
        db.updateByType('computers', computers);
        
        // Обновляем статусы сетевых устройств
        const networkDevices = db.getByType('networkDevices');
        networkDevices.forEach(device => {
            const newStatus = StatusManager.getStatus(device.notes);
            if (device.status !== newStatus) {
                device.status = newStatus;
                updatedCount++;
            }
        });
        db.updateByType('networkDevices', networkDevices);
        
        // Обновляем статусы другой техники
        const otherDevices = db.getByType('otherDevices');
        otherDevices.forEach(device => {
            const newStatus = StatusManager.getStatus(device.notes);
            if (device.status !== newStatus) {
                device.status = newStatus;
                updatedCount++;
            }
        });
        db.updateByType('otherDevices', otherDevices);
        
        if (updatedCount > 0) {
            NotificationManager.success(`Обновлено статусов: ${updatedCount}`);
            renderCurrentTab();
        } else {
            NotificationManager.info('Все статусы уже актуальны');
        }
    } catch (error) {
        NotificationManager.error('Ошибка при обновлении статусов: ' + error.message);
    }
}

// Функция для сортировки таблицы
function sortTable(field, tableType) {
    if (currentSortField === field) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortField = field;
        currentSortDirection = 'asc';
    }
    
    let data;
    switch (tableType) {
        case 'computers':
            data = db.getByType('computers');
            data = FilterManager.sortBy(data, field, currentSortDirection);
            renderComputerTable(data);
            break;
        case 'network':
            data = db.getByType('networkDevices');
            data = FilterManager.sortBy(data, field, currentSortDirection);
            renderNetworkTable(data);
            break;
        case 'other':
            data = db.getByType('otherDevices');
            data = FilterManager.sortBy(data, field, currentSortDirection);
            renderOtherTable(data);
            break;
        case 'assigned':
            data = db.getByType('assignedDevices');
            data = FilterManager.sortBy(data, field, currentSortDirection);
            renderAssignedTable(data);
            break;
    }
}

// Функция для добавления обработчиков сортировки к заголовкам таблиц
function addSortHandlers() {
    // Добавляем обработчики для заголовков таблиц
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            if (index < headers.length - 1) { // Не добавляем сортировку для колонки "Действия"
                header.style.cursor = 'pointer';
                header.addEventListener('click', () => {
                    const tableType = table.closest('.tab-content').id;
                    const field = getSortFieldByIndex(tableType, index);
                    if (field) {
                        sortTable(field, tableType);
                    }
                });
            }
        });
    });
}

// Функция для получения поля сортировки по индексу колонки
function getSortFieldByIndex(tableType, index) {
    const fieldMaps = {
        computers: ['id', 'inventoryNumber', 'building', 'location', 'deviceType', 'model', 'processor', 'ram', 'ipAddress', 'computerName', 'status'],
        network: ['id', 'type', 'model', 'building', 'location', 'ipAddress', 'login', 'wifiName', 'status'],
        other: ['id', 'type', 'model', 'building', 'location', 'responsible', 'inventoryNumber', 'status'],
        assigned: ['id', 'employee', 'position', 'building', 'devices', 'assignedDate']
    };
    
    return fieldMaps[tableType] ? fieldMaps[tableType][index] : null;
}

// Инициализация обработчиков сортировки после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addSortHandlers, 1000); // Небольшая задержка для полной загрузки таблиц
});

// Функция для экспорта отчета
function generateReport() {
    const stats = getStatusStatistics();
    const computers = db.getByType('computers');
    const networkDevices = db.getByType('networkDevices');
    const otherDevices = db.getByType('otherDevices');
    const assignedDevices = db.getByType('assignedDevices');
    
    const report = {
        generatedDate: new Date().toISOString(),
        summary: {
            totalComputers: computers.length,
            totalNetworkDevices: networkDevices.length,
            totalOtherDevices: otherDevices.length,
            totalAssignedDevices: assignedDevices.length,
            statusStatistics: stats
        },
        computers: computers,
        networkDevices: networkDevices,
        otherDevices: otherDevices,
        assignedDevices: assignedDevices
    };
    
    const filename = `equipment_report_${DateUtils.getCurrentDate()}.json`;
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    
    NotificationManager.success(`Отчет сгенерирован: ${filename}`);
}

// Глобальные функции для доступа из HTML
window.openTab = openTab;
window.openComputerModal = openComputerModal;
window.openNetworkModal = openNetworkModal;
window.openOtherModal = openOtherModal;
window.openAssignedModal = openAssignedModal;
window.editComputer = editComputer;
window.editNetworkDevice = editNetworkDevice;
window.editOtherDevice = editOtherDevice;
window.editAssignedDevice = editAssignedDevice;
window.deleteComputer = deleteComputer;
window.deleteNetworkDevice = deleteNetworkDevice;
window.deleteOtherDevice = deleteOtherDevice;
window.deleteAssignedDevice = deleteAssignedDevice;
window.closeModal = closeModal;
window.exportData = exportData;
window.exportToExcel = exportToExcel;
window.importComputers = importComputers;
window.searchByInventoryNumber = searchByInventoryNumber;
window.searchDeviceByInventoryNumber = searchDeviceByInventoryNumber;
window.createBackup = createBackup;
window.restoreFromBackup = restoreFromBackup;
window.clearAllData = clearAllData;
window.showStatusStatistics = showStatusStatistics;
window.findDuplicateInventoryNumbers = findDuplicateInventoryNumbers;
window.validateAllIPAddresses = validateAllIPAddresses;
window.recalculateAllStatuses = recalculateAllStatuses;
window.generateReport = generateReport;