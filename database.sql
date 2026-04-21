-- ระบบบริหารหอพัก - Database Schema
-- PHP 7.3.4 / MySQL 5.7

CREATE DATABASE IF NOT EXISTS dorm_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dorm_management;

-- ตารางผู้ใช้งาน (Admin)
CREATE TABLE dorm_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin','staff') DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ตารางห้องพัก
CREATE TABLE dorm_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(20) NOT NULL UNIQUE,
    floor INT NOT NULL DEFAULT 1,
    room_type VARCHAR(50) DEFAULT 'standard',
    rent_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    status ENUM('vacant','occupied','maintenance') DEFAULT 'vacant',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ตารางผู้เช่า
CREATE TABLE dorm_tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    id_card VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    start_date DATE NOT NULL,
    end_date DATE,
    deposit DECIMAL(10,2) DEFAULT 0,
    status ENUM('active','inactive') DEFAULT 'active',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES dorm_rooms(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ตารางอัตราค่าใช้จ่าย
CREATE TABLE dorm_utility_rates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    electric_rate DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    water_rate DECIMAL(10,2) NOT NULL DEFAULT 18.00,
    other_fee DECIMAL(10,2) DEFAULT 0,
    effective_date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ตารางบันทึกมิเตอร์
CREATE TABLE dorm_meter_readings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    bill_month INT NOT NULL,
    bill_year INT NOT NULL,
    prev_electric DECIMAL(10,2) DEFAULT 0,
    curr_electric DECIMAL(10,2) DEFAULT 0,
    prev_water DECIMAL(10,2) DEFAULT 0,
    curr_water DECIMAL(10,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES dorm_rooms(id) ON DELETE CASCADE,
    UNIQUE KEY unique_room_month (room_id, bill_month, bill_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ตารางบิล/ใบแจ้งหนี้
CREATE TABLE dorm_bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    tenant_id INT NOT NULL,
    bill_month INT NOT NULL,
    bill_year INT NOT NULL,
    rent_amount DECIMAL(10,2) DEFAULT 0,
    electric_units DECIMAL(10,2) DEFAULT 0,
    electric_amount DECIMAL(10,2) DEFAULT 0,
    water_units DECIMAL(10,2) DEFAULT 0,
    water_amount DECIMAL(10,2) DEFAULT 0,
    other_amount DECIMAL(10,2) DEFAULT 0,
    other_description VARCHAR(255),
    total_amount DECIMAL(10,2) DEFAULT 0,
    due_date DATE,
    status ENUM('pending','paid','overdue') DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES dorm_rooms(id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id) REFERENCES dorm_tenants(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_bill (room_id, bill_month, bill_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ตารางการชำระเงิน
CREATE TABLE dorm_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    payment_method ENUM('cash','transfer','other') DEFAULT 'cash',
    reference_no VARCHAR(100),
    notes TEXT,
    created_by INT,
    FOREIGN KEY (bill_id) REFERENCES dorm_bills(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES dorm_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ตารางประวัติกิจกรรม
CREATE TABLE dorm_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    module VARCHAR(50),
    ref_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES dorm_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ข้อมูลเริ่มต้น
-- Admin user (password: admin1234)
INSERT INTO dorm_users (username, password, full_name, role) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ผู้ดูแลระบบ', 'admin');

-- อัตราค่าไฟ/น้ำเริ่มต้น
INSERT INTO dorm_utility_rates (name, electric_rate, water_rate, other_fee, effective_date) VALUES
('อัตราปัจจุบัน', 6.00, 18.00, 0, CURDATE());

-- ห้องตัวอย่าง
INSERT INTO dorm_rooms (room_number, floor, room_type, rent_price, status) VALUES
('101', 1, 'standard', 3000.00, 'occupied'),
('102', 1, 'standard', 3000.00, 'vacant'),
('201', 2, 'deluxe', 4000.00, 'vacant');
