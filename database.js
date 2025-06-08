// Эмуляция базы данных в локальном хранилище
class Database {
    constructor() {
        this.storageKey = 'equipment_management_db';
        this.initDatabase();
    }

    // Инициализация базы данных
    initDatabase() {
        if (!this.getData()) {
            this.setData({
                computers: this.getDefaultComputers(),
                networkDevices: this.getDefaultNetworkDevices(),
                otherDevices: this.getDefaultOtherDevices(),
                assignedDevices: this.getDefaultAssignedDevices(),
                importedComputers: [] // Импортированные из Excel данные
            });
        }
    }

    // Получение всех данных
    getData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            return null;
        }
    }

    // Сохранение всех данных
    setData(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Ошибка при сохранении данных:', error);
            return false;
        }
    }

    // Получение данных по типу
    getByType(type) {
        const data = this.getData();
        return data ? data[type] || [] : [];
    }

    // Обновление данных по типу
    updateByType(type, newData) {
        const data = this.getData();
        if (data) {
            data[type] = newData;
            return this.setData(data);
        }
        return false;
    }

    // Добавление записи
    add(type, item) {
        const items = this.getByType(type);
        const newId = Math.max(...items.map(i => i.id), 0) + 1;
        const newItem = { ...item, id: newId };
        items.push(newItem);
        return this.updateByType(type, items) ? newItem : null;
    }

    // Обновление записи
    update(type, id, updatedItem) {
        const items = this.getByType(type);
        const index = items.findIndex(item => item.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...updatedItem };
            return this.updateByType(type, items) ? items[index] : null;
        }
        return null;
    }

    // Удаление записи
    delete(type, id) {
        const items = this.getByType(type);
        const filteredItems = items.filter(item => item.id !== id);
        return this.updateByType(type, filteredItems);
    }

    // Поиск по инвентарному номеру
    findByInventoryNumber(inventoryNumber) {
        const computers = this.getByType('computers');
        const importedComputers = this.getByType('importedComputers');
        const otherDevices = this.getByType('otherDevices');

        // Поиск в компьютерах
        let found = computers.find(c => c.inventoryNumber === inventoryNumber);
        if (found) return { type: 'computers', data: found };

        // Поиск в импортированных данных
        found = importedComputers.find(c => c.inventoryNumber === inventoryNumber);
        if (found) return { type: 'importedComputers', data: found };

        // Поиск в другой технике
        found = otherDevices.find(d => d.inventoryNumber === inventoryNumber);
        if (found) return { type: 'otherDevices', data: found };

        return null;
    }

    // Импорт данных из Excel
    importFromExcel(excelData) {
        try {
            const importedComputers = [];
            
            excelData.forEach((row, index) => {
                if (index < 3) return; // Пропускаем заголовки
                
                if (row[0] && row[0] !== '') {
                    const computer = {
                        id: row[0],
                        inventoryNumber: row[1] || '',
                        location: row[2] || '',
                        deviceType: this.normalizeDeviceType(row[3] || ''),
                        model: row[4] || '',
                        screen: row[5] || '',
                        os: row[6] || '',
                        processor: row[7] || '',
                        cores: row[8] || '',
                        ram: row[9] || '',
                        storage: row[10] || '',
                        graphics: row[11] || '',
                        year: row[12] || '',
                        status: 'working',
                        building: this.determineBuilding(row[2] || ''),
                        computerName: '',
                        ipAddress: '',
                        notes: ''
                    };
                    importedComputers.push(computer);
                }
            });

            // Сохраняем импортированные данные
            this.updateByType('importedComputers', importedComputers);
            
            return {
                success: true,
                count: importedComputers.length,
                data: importedComputers
            };
        } catch (error) {
            console.error('Ошибка при импорте данных:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Нормализация типа устройства
    normalizeDeviceType(type) {
        const typeMap = {
            'компьютер': 'компьютер',
            'ноутбук': 'ноутбук',
            'нетбук': 'нетбук'
        };
        return typeMap[type.toLowerCase()] || 'компьютер';
    }

    // Определение корпуса по расположению
    determineBuilding(location) {
        if (typeof location === 'string') {
            if (location.includes('мед') || location.includes('МЕД')) {
                return 'медицинский';
            }
        }
        return 'главный';
    }

    // Экспорт данных в формат для Excel
    exportToExcel(type) {
        const data = this.getByType(type);
        
        switch (type) {
            case 'computers':
                return this.exportComputersToExcel(data);
            case 'network':
                return this.exportNetworkToExcel(data);
            case 'other':
                return this.exportOtherToExcel(data);
            case 'assigned':
                return this.exportAssignedToExcel(data);
            default:
                return [];
        }
    }

    exportComputersToExcel(computers) {
        const headers = [
            'ID', 'Инвентарный номер', 'Корпус', 'Расположение', 'Тип устройства',
            'Модель', 'Процессор', 'ОЗУ', 'Накопитель', 'Видеокарта',
            'IP-адрес', 'Имя компьютера', 'Год', 'Статус', 'Примечания'
        ];
        
        const rows = computers.map(c => [
            c.id, c.inventoryNumber, c.building, c.location, c.deviceType,
            c.model, c.processor, c.ram, c.storage, c.graphics,
            c.ipAddress, c.computerName, c.year, c.status, c.notes
        ]);
        
        return [headers, ...rows];
    }

    exportNetworkToExcel(devices) {
        const headers = [
            'ID', 'Тип', 'Модель', 'Корпус', 'Расположение', 'IP-адрес',
            'Логин', 'Пароль', 'WiFi сеть', 'Пароль WiFi', 'Статус', 'Примечания'
        ];
        
        const rows = devices.map(d => [
            d.id, d.type, d.model, d.building, d.location, d.ipAddress,
            d.login, d.password, d.wifiName, d.wifiPassword, d.status, d.notes
        ]);
        
        return [headers, ...rows];
    }

    exportOtherToExcel(devices) {
        const headers = [
            'ID', 'Тип', 'Модель', 'Корпус', 'Расположение', 'Ответственный',
            'Инвентарный номер', 'Статус', 'Примечания'
        ];
        
        const rows = devices.map(d => [
            d.id, d.type, d.model, d.building, d.location, d.responsible,
            d.inventoryNumber, d.status, d.notes
        ]);
        
        return [headers, ...rows];
    }

    exportAssignedToExcel(assignments) {
        const headers = [
            'ID', 'Сотрудник', 'Должность', 'Корпус', 'Устройства',
            'Дата назначения', 'Примечания'
        ];
        
        const rows = assignments.map(a => [
            a.id, a.employee, a.position, a.building, a.devices.join('; '),
            a.assignedDate, a.notes
        ]);
        
        return [headers, ...rows];
    }

    // Получение статистики
    getStats() {
        return {
            computers: this.getByType('computers').length,
            network: this.getByType('networkDevices').length,
            other: this.getByType('otherDevices').length,
            assigned: this.getByType('assignedDevices').length
        };
    }

    // Резервное копирование
    backup() {
        const data = this.getData();
        const backup = {
            timestamp: new Date().toISOString(),
            data: data
        };
        
        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `equipment_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // Восстановление из резервной копии
    restore(backupData) {
        try {
            const backup = JSON.parse(backupData);
            if (backup.data) {
                this.setData(backup.data);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Ошибка при восстановлении:', error);
            return false;
        }
    }

    // Дефолтные данные для компьютеров
    getDefaultComputers() {
        return [
            {
                id: 1,
                inventoryNumber: "0100115",
                building: "главный",
                location: "303 каб (07)",
                deviceType: "нетбук",
                model: "samsung np-n100",
                processor: "Intel atom n435 1,33Ghz",
                ram: "1Gb(DDR3-1333)",
                storage: "300Gb",
                graphics: "Intel graphics 3150",
                ipAddress: "192.168.100.166",
                computerName: "01-NET",
                year: "2012",
                notes: "",
                status: "working"
            },
            {
                id: 2,
                inventoryNumber: "0100215",
                building: "главный",
                location: "303 каб (01)",
                deviceType: "нетбук",
                model: "samsung np-n100",
                processor: "Intel atom n435 1,33Ghz",
                ram: "1Gb(DDR3-1333)",
                storage: "80Gb",
                graphics: "Intel graphics 3150",
                ipAddress: "192.168.100.165",
                computerName: "02-NET",
                year: "2012",
                notes: "Медленный HDD",
                status: "issues"
            },
            {
                id: 3,
                inventoryNumber: "0100315",
                building: "медицинский",
                location: "101 каб",
                deviceType: "компьютер",
                model: "HP EliteDesk 800 G3",
                processor: "Intel Core i5-7500",
                ram: "8Gb DDR4",
                storage: "256Gb SSD",
                graphics: "Intel HD Graphics 630",
                ipAddress: "192.168.200.10",
                computerName: "MED-01",
                year: "2018",
                notes: "",
                status: "working"
            }
        ];
    }

    // Дефолтные данные для сетевого оборудования
    getDefaultNetworkDevices() {
        return [
            {
                id: 1,
                type: "роутер",
                model: "TP-Link Archer C7",
                building: "главный",
                location: "Серверная 1 этаж",
                ipAddress: "192.168.1.1",
                login: "admin",
                password: "admin123",
                wifiName: "College_Main",
                wifiPassword: "college2024",
                notes: "Основной роутер главного корпуса",
                status: "working"
            },
            {
                id: 2,
                type: "свитч",
                model: "D-Link DGS-1016D",
                building: "главный",
                location: "303 каб",
                ipAddress: "192.168.1.10",
                login: "",
                password: "",
                wifiName: "",
                wifiPassword: "",
                notes: "16-портовый коммутатор",
                status: "working"
            }
        ];
    }

    // Дефолтные данные для другой техники
    getDefaultOtherDevices() {
        return [
            {
                id: 1,
                type: "принтер",
                model: "HP LaserJet Pro P1102",
                building: "главный",
                location: "Деканат",
                responsible: "Иванова А.П.",
                inventoryNumber: "PR001",
                notes: "Черно-белый лазерный принтер",
                status: "working"
            },
            {
                id: 2,
                type: "проектор",
                model: "Epson EB-X41",
                building: "медицинский",
                location: "Аудитория 205",
                responsible: "Петров В.И.",
                inventoryNumber: "PRJ002",
                notes: "Требует замену лампы",
                status: "issues"
            }
        ];
    }

    // Дефолтные данные для назначенных устройств
    getDefaultAssignedDevices() {
        return [
            {
                id: 1,
                employee: "Сидоров Игорь Владимирович",
                position: "Преподаватель информатики",
                building: "главный",
                devices: ["Ноутбук Lenovo ThinkPad E15 (LT001)", "Проектор Epson EB-U05 (PRJ001)"],
                assignedDate: "2024-01-15",
                notes: "Выдано для проведения занятий"
            },
            {
                id: 2,
                employee: "Козлова Елена Петровна",
                position: "Заведующий библиотекой",
                building: "медицинский",
                devices: ["Компьютер HP Pavilion Desktop (PC002)", "Принтер Canon PIXMA G3410 (PR003)"],
                assignedDate: "2024-02-01",
                notes: "Для работы в библиотеке"
            }
        ];
    }
}

// Создаем глобальный экземпляр базы данных
const db = new Database();