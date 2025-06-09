class Database {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.data = {
            computers: [],
            networkDevices: [],
            otherDevices: [],
            assignedDevices: [],
            importedComputers: []
        };
    }

    async init() {
        const types = ['computers', 'networkDevices', 'otherDevices', 'assignedDevices'];
        for (const type of types) {
            try {
                const res = await fetch(`${this.baseUrl}/${type}`);
                if (res.ok) {
                    this.data[type] = await res.json();
                }
            } catch (err) {
                console.error('Init fetch error for', type, err);
            }
        }
    }

    getByType(type) {
        return this.data[type] || [];
    }

    updateByType(type, newData) {
        this.data[type] = newData;
        newData.forEach(item => {
            if (item.id) {
                fetch(`${this.baseUrl}/${type}/${item.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                }).catch(console.error);
            }
        });
        return true;
    }

    add(type, item) {
        const items = this.getByType(type);
        const newId = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
        const newItem = { id: newId, ...item };
        items.push(newItem);
        fetch(`${this.baseUrl}/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItem)
        }).catch(console.error);
        return newItem;
    }

    update(type, id, updatedItem) {
        const items = this.getByType(type);
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...updatedItem };
            fetch(`${this.baseUrl}/${type}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(items[index])
            }).catch(console.error);
            return items[index];
        }
        return null;
    }

    delete(type, id) {
        const items = this.getByType(type);
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items.splice(index, 1);
            fetch(`${this.baseUrl}/${type}/${id}`, { method: 'DELETE' }).catch(console.error);
            return true;
        }
        return false;
    }

    findByInventoryNumber(number) {
        for (const type of ['computers', 'importedComputers', 'otherDevices']) {
            const item = this.getByType(type).find(i => i.inventoryNumber === number);
            if (item) return { type, data: item };
        }
        return null;
    }

    determineBuilding(location) {
        if (typeof location === 'string') {
            if (location.includes('мед') || location.includes('МЕД')) {
                return 'медицинский';
            }
        }
        return 'главный';
    }

    importFromExcel(excelData) {
        try {
            const imported = [];
            excelData.forEach((row, idx) => {
                if (idx < 3) return;
                if (row[0]) {
                    const item = {
                        inventoryNumber: row[1] || '',
                        location: row[2] || '',
                        deviceType: row[3] || '',
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
                    const added = this.add('computers', item);
                    if (added) imported.push(added);
                }
            });
            this.updateByType('importedComputers', imported);
            return { success: true, count: imported.length, data: imported };
        } catch (error) {
            console.error('Import error', error);
            return { success: false, error: error.message };
        }
    }

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
        const headers = ['ID','Инвентарный номер','Корпус','Расположение','Тип устройства','Модель','Процессор','ОЗУ','Накопитель','Видеокарта','IP-адрес','Имя компьютера','Год','Статус','Примечания'];
        const rows = computers.map(c => [c.id,c.inventoryNumber,c.building,c.location,c.deviceType,c.model,c.processor,c.ram,c.storage,c.graphics,c.ipAddress,c.computerName,c.year,c.status,c.notes]);
        return [headers, ...rows];
    }

    exportNetworkToExcel(devices) {
        const headers = ['ID','Тип','Модель','Корпус','Расположение','IP-адрес','Логин','Пароль','WiFi сеть','Пароль WiFi','Статус','Примечания'];
        const rows = devices.map(d => [d.id,d.type,d.model,d.building,d.location,d.ipAddress,d.login,d.password,d.wifiName,d.wifiPassword,d.status,d.notes]);
        return [headers, ...rows];
    }

    exportOtherToExcel(devices) {
        const headers = ['ID','Тип','Модель','Корпус','Расположение','Ответственный','Инвентарный номер','Статус','Примечания'];
        const rows = devices.map(d => [d.id,d.type,d.model,d.building,d.location,d.responsible,d.inventoryNumber,d.status,d.notes]);
        return [headers, ...rows];
    }

    exportAssignedToExcel(assignments) {
        const headers = ['ID','Сотрудник','Должность','Корпус','Устройства','Дата назначения','Примечания'];
        const rows = assignments.map(a => [a.id,a.employee,a.position,a.building,a.devices.join('; '),a.assignedDate,a.notes]);
        return [headers, ...rows];
    }

    getStats() {
        return {
            computers: this.getByType('computers').length,
            network: this.getByType('networkDevices').length,
            other: this.getByType('otherDevices').length,
            assigned: this.getByType('assignedDevices').length
        };
    }

    backup() {
        const backup = {
            timestamp: new Date().toISOString(),
            data: this.data
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

    restore(backupData) {
        try {
            const backup = JSON.parse(backupData);
            if (backup.data) {
                this.data = backup.data;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Restore error', error);
            return false;
        }
    }
}

const db = new Database();
