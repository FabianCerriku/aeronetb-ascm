-- ============================================================
-- AeroNetB ASCM - Dummy Data
-- 5CM506 Data Driven Systems - Task 2
-- ============================================================

-- ── Suppliers ─────────────────────────────────────────────
INSERT INTO suppliers VALUES
('SUP-001','Airframe Solutions Ltd',   '12 Industrial Park, Bristol, UK',       'AS9100', 'contact@airframesol.com',  '+44-117-555-0101'),
('SUP-002','CompositeWorks GmbH',      'Werkstraße 4, Hamburg, Germany',         'ISO9001','info@compositeworks.de',   '+49-40-555-0202'),
('SUP-003','PrecisionAero Inc',        '800 Aerospace Blvd, Seattle, USA',       'AS9100', 'sales@precisionaero.com',  '+1-206-555-0303'),
('SUP-004','FutureFab Technologies',   'Zone 7, Dubai Industrial City, UAE',     'ISO9001','info@futurefab.ae',        '+971-4-555-0404'),
('SUP-005','Nordic Aeroparts AB',      'Verkstadsgatan 2, Gothenburg, Sweden',   'AS9100', 'orders@nordicaero.se',     '+46-31-555-0505');

-- ── Parts ─────────────────────────────────────────────────
INSERT INTO parts VALUES
('PART-001','A320 Fuselage Panel',   'Forward fuselage section panel for A320 family', 45.200),
('PART-002','Wing Assembly Bracket', 'Titanium bracket for wing-to-fuselage junction',  8.750),
('PART-003','Engine Mount Frame',    'High-strength steel frame for turbofan mount',    62.100),
('PART-004','Landing Gear Strut',    'Carbon-fibre reinforced strut assembly',          28.400),
('PART-005','Avionics Bay Door',     'Composite access panel for avionics bay',          5.900);

-- ── Supplier-Part links ────────────────────────────────────
INSERT INTO supplier_parts VALUES
('SUP-001','PART-001','Anti-corrosion coating; RFID tags embedded for lifecycle tracking'),
('SUP-002','PART-001','Reinforced composite layering; integrated shock sensors in packaging'),
('SUP-003','PART-002','Precision CNC machining to ±0.01mm tolerance'),
('SUP-001','PART-003','Certified weld inspection included; heat treatment log provided'),
('SUP-004','PART-003','Digital twin simulation data provided alongside delivery'),
('SUP-005','PART-004','Optimised heat treatment; 3% lighter than baseline spec'),
('SUP-003','PART-005','UV-resistant gel coat finish; quick-release fastener system');

-- ── Facilities ────────────────────────────────────────────
INSERT INTO facilities VALUES
('FAC-001','Derby Assembly Plant',      'Pride Park, Derby, UK'),
('FAC-002','Hamburg Production Centre', 'Finkenwerder, Hamburg, Germany'),
('FAC-003','Seattle Manufacturing Hub', 'Boeing Field, Seattle, USA');

-- ── Equipment ─────────────────────────────────────────────
INSERT INTO equipment VALUES
('EQP-001','FAC-001','CNC Milling Machine Alpha',  'CNC Mill',     'ok'),
('EQP-002','FAC-001','Autoclave Unit 1',            'Autoclave',    'warning'),
('EQP-003','FAC-002','NDT Scanner X-Ray Unit',      'NDT Scanner',  'ok'),
('EQP-004','FAC-002','Composite Layup Station',     'Layup Station','ok'),
('EQP-005','FAC-003','Hydraulic Press P-200',       'Press',        'critical'),
('EQP-006','FAC-003','CMM Measuring Arm',           'CMM',          'ok');

-- ── Purchase Orders ───────────────────────────────────────
INSERT INTO purchase_orders VALUES
('PO-2024-001','SUP-001','PART-001','2024-01-10','2024-02-10','2024-02-08','completed'),
('PO-2024-002','SUP-002','PART-001','2024-01-15','2024-02-15','2024-02-20','completed'),
('PO-2024-003','SUP-003','PART-002','2024-02-01','2024-03-01','2024-02-28','completed'),
('PO-2024-004','SUP-004','PART-003','2024-02-10','2024-03-10', NULL,       'dispatched'),
('PO-2024-005','SUP-005','PART-004','2024-02-20','2024-03-20', NULL,       'dispatched'),
('PO-2024-006','SUP-001','PART-003','2024-03-01','2024-04-01', NULL,       'confirmed'),
('PO-2024-007','SUP-003','PART-005','2024-03-05','2024-04-05', NULL,       'placed'),
('PO-2024-008','SUP-002','PART-002','2024-03-10','2024-04-10', NULL,       'placed'),
('PO-2024-009','SUP-004','PART-001','2024-03-12','2024-04-12', NULL,       'confirmed'),
('PO-2024-010','SUP-005','PART-005','2024-03-15','2024-04-15', NULL,       'placed');

-- ── Shipments ─────────────────────────────────────────────
INSERT INTO shipments VALUES
('SHIP-001','PO-2024-001','TRK-AA-10012','Bristol Port',    'arrived',   '2024-02-08'),
('SHIP-002','PO-2024-002','TRK-BB-20034','Felixstowe Port', 'arrived',   '2024-02-20'),
('SHIP-003','PO-2024-003','TRK-CC-30056','Heathrow Air',    'arrived',   '2024-02-28'),
('SHIP-004','PO-2024-004','TRK-DD-40078','Southampton Port','in_transit', '2024-03-25'),
('SHIP-005','PO-2024-005','TRK-EE-50090','Tilbury Port',    'in_transit', '2024-03-28'),
('SHIP-006','PO-2024-006','TRK-FF-60012','Bristol Port',    'pending',   '2024-04-08'),
('SHIP-007','PO-2024-007','TRK-GG-70034','Heathrow Air',    'pending',   '2024-04-10'),
('SHIP-008','PO-2024-008','TRK-HH-80056','Felixstowe Port', 'pending',   '2024-04-15');

-- ── Employees (password_hash is bcrypt of 'password123') ──
INSERT INTO employees VALUES
('EMP-001','Sarah Mitchell',  'Procurement Officer',    'Procurement','sarah.mitchell@aeronetb.com', '+44-1332-101001','write', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGpr7zPZi4e5gj2m6W','procurement_officer',  NOW()),
('EMP-002','James Okafor',    'Procurement Officer',    'Procurement','james.okafor@aeronetb.com',   '+44-1332-101002','write', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGpr7zPZi4e5gj2m6W','procurement_officer',  NOW()),
('EMP-003','Dr. Elena Petrov','Quality Inspector',      'Quality',    'elena.petrov@aeronetb.com',   '+44-1332-101003','approve','$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGpr7zPZi4e5gj2m6W','quality_inspector',    NOW()),
('EMP-004','Marcus Webb',     'Quality Inspector',      'Quality',    'marcus.webb@aeronetb.com',    '+44-1332-101004','approve','$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGpr7zPZi4e5gj2m6W','quality_inspector',    NOW()),
('EMP-005','Fatima Al-Rashid','Supply Chain Manager',   'Operations', 'fatima.rashid@aeronetb.com',  '+44-1332-101005','write', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGpr7zPZi4e5gj2m6W','supply_chain_manager', NOW()),
('EMP-006','Tom Brennan',     'Equipment Engineer',     'Engineering','tom.brennan@aeronetb.com',    '+44-1332-101006','write', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGpr7zPZi4e5gj2m6W','equipment_engineer',   NOW()),
('EMP-007','Ingrid Svensson', 'Auditor',                'Compliance', 'ingrid.svensson@aeronetb.com','+44-1332-101007','audit', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGpr7zPZi4e5gj2m6W','auditor',              NOW());

-- ── Role subtypes ─────────────────────────────────────────
INSERT INTO procurement_officers VALUES
('EMP-001','Europe',  500000.00),
('EMP-002','Middle East & Asia', 250000.00);

INSERT INTO quality_inspectors VALUES
('EMP-003','QI-CERT-2021-003','NDT, Dimensional Analysis',   'SIG-PETROV-2024'),
('EMP-004','QI-CERT-2020-041','Environmental Testing',       'SIG-WEBB-2024');

INSERT INTO supply_chain_managers VALUES
('EMP-005','Fuselage, Wing Assemblies','Regional Manager');

INSERT INTO equipment_engineers VALUES
('EMP-006','ENG-LIC-UK-8821','FAC-001');

INSERT INTO auditors VALUES
('EMP-007','Civil Aviation Authority','AUD-CAA-0094','External Compliance, Safety Certification');

-- ── Certifications ────────────────────────────────────────
INSERT INTO certifications VALUES
('CERT-001','PART-001','EMP-003','Tensile: 452MPa, Fatigue: 203MPa — PASS',
 'STAMP-PETROV-001','Batch: AL-2024-00112 — Origin: Constellium UK',
 'approved', TRUE, '2024-02-12', NOW()),

('CERT-002','PART-002','EMP-003','Dimensional tolerance ±0.008mm — PASS',
 'STAMP-PETROV-002','Batch: TI-2024-00231 — Origin: VSMPO Russia',
 'approved', TRUE, '2024-03-01', NOW()),

('CERT-003','PART-003','EMP-004','NDT scan clear — no subsurface defects — PASS',
 'STAMP-WEBB-001','Batch: ST-2024-00089 — Origin: Tata Steel UK',
 'pending', FALSE, NULL, NOW()),

('CERT-004','PART-004','EMP-004','Environmental stress test — 200 cycles — PASS',
 'STAMP-WEBB-002','Batch: CF-2024-00344 — Origin: Toray Industries JP',
 'pending', FALSE, NULL, NOW());

-- ── Audit log seed entries ─────────────────────────────────
INSERT INTO audit_logs (emp_id, action, target_table, target_record, details) VALUES
('EMP-001','LOGIN',  NULL,             NULL,       'Successful login'),
('EMP-003','CREATE', 'certifications', 'CERT-001', 'Created certification for PART-001'),
('EMP-003','APPROVE','certifications', 'CERT-001', 'Approved and locked certification CERT-001'),
('EMP-005','VIEW',   'shipments',      'SHIP-004', 'Viewed shipment tracking details'),
('EMP-007','VIEW',   'certifications', 'CERT-001', 'Auditor reviewed certification CERT-001');
