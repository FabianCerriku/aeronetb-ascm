-- ============================================================
-- AeroNetB ASCM - PostgreSQL Schema
-- 5CM506 Data Driven Systems - Task 2
-- ============================================================

-- Drop tables if they exist (for clean re-runs)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS auditors CASCADE;
DROP TABLE IF EXISTS equipment_engineers CASCADE;
DROP TABLE IF EXISTS supply_chain_managers CASCADE;
DROP TABLE IF EXISTS quality_inspectors CASCADE;
DROP TABLE IF EXISTS procurement_officers CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS certifications CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS supplier_parts CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS facilities CASCADE;
DROP TABLE IF EXISTS parts CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- ============================================================
-- DOMAIN 1: Suppliers & Parts
-- ============================================================

CREATE TABLE suppliers (
    supplier_id     VARCHAR(20) PRIMARY KEY,
    business_name   VARCHAR(100) NOT NULL,
    address         VARCHAR(200),
    accreditation   VARCHAR(50),   -- e.g. ISO9001, AS9100
    contact_email   VARCHAR(100),
    contact_phone   VARCHAR(30),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE parts (
    part_id         VARCHAR(20) PRIMARY KEY,
    part_name       VARCHAR(100) NOT NULL,
    description     TEXT,
    unit_weight_kg  DECIMAL(10,3)
);

-- Resolves M:N between suppliers and parts
-- Also holds supplier-specific customisation notes
CREATE TABLE supplier_parts (
    supplier_id     VARCHAR(20) REFERENCES suppliers(supplier_id),
    part_id         VARCHAR(20) REFERENCES parts(part_id),
    customizations  TEXT,
    PRIMARY KEY (supplier_id, part_id)
);

-- ============================================================
-- DOMAIN 2: Orders & Shipments
-- ============================================================

CREATE TABLE purchase_orders (
    order_id            VARCHAR(20) PRIMARY KEY,
    supplier_id         VARCHAR(20) REFERENCES suppliers(supplier_id),
    part_id             VARCHAR(20) REFERENCES parts(part_id),
    order_date          DATE NOT NULL,
    desired_delivery    DATE,
    actual_delivery     DATE,
    status              VARCHAR(20) DEFAULT 'placed'
                        CHECK (status IN ('placed','confirmed','dispatched','delivered','completed'))
);

CREATE TABLE shipments (
    shipment_id     VARCHAR(20) PRIMARY KEY,
    order_id        VARCHAR(20) REFERENCES purchase_orders(order_id),
    tracking_number VARCHAR(50),
    port_of_entry   VARCHAR(100),
    current_status  VARCHAR(20) DEFAULT 'in_transit'
                    CHECK (current_status IN ('pending','in_transit','arrived','cleared')),
    eta             DATE
);

-- ============================================================
-- DOMAIN 3: Facilities & Equipment
-- ============================================================

CREATE TABLE facilities (
    facility_id     VARCHAR(20) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    location        VARCHAR(200)
);

CREATE TABLE equipment (
    equipment_id    VARCHAR(20) PRIMARY KEY,
    facility_id     VARCHAR(20) REFERENCES facilities(facility_id),
    name            VARCHAR(100) NOT NULL,
    equipment_type  VARCHAR(50),
    status          VARCHAR(20) DEFAULT 'ok'
                    CHECK (status IN ('ok','warning','critical','offline'))
);

-- ============================================================
-- DOMAIN 4: Certifications (immutable once approved)
-- ============================================================

CREATE TABLE certifications (
    cert_id                 VARCHAR(20) PRIMARY KEY,
    part_id                 VARCHAR(20) REFERENCES parts(part_id),
    inspector_id            VARCHAR(20),   -- soft ref to employees
    test_results            TEXT,
    digital_stamp           VARCHAR(100),
    material_traceability   TEXT,
    status                  VARCHAR(20) DEFAULT 'pending'
                            CHECK (status IN ('pending','approved','rejected')),
    is_immutable            BOOLEAN DEFAULT FALSE,
    approved_at             TIMESTAMP,
    created_at              TIMESTAMP DEFAULT NOW()
);

-- Trigger: once is_immutable = TRUE, block all updates
CREATE OR REPLACE FUNCTION block_immutable_cert()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_immutable = TRUE THEN
        RAISE EXCEPTION 'Certification % is immutable and cannot be modified.', OLD.cert_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_certification
BEFORE UPDATE ON certifications
FOR EACH ROW EXECUTE FUNCTION block_immutable_cert();

-- ============================================================
-- DOMAIN 5: Roles & Access Control
-- ============================================================

CREATE TABLE employees (
    emp_id          VARCHAR(20) PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL,
    job_title       VARCHAR(50),
    department      VARCHAR(50),
    email           VARCHAR(100) UNIQUE NOT NULL,
    phone           VARCHAR(30),
    access_level    VARCHAR(20) CHECK (access_level IN ('read','write','approve','audit')),
    password_hash   VARCHAR(255) NOT NULL,   -- bcrypt hash
    role            VARCHAR(30) NOT NULL
                    CHECK (role IN ('procurement_officer','quality_inspector',
                                    'supply_chain_manager','equipment_engineer','auditor')),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Role subtypes
CREATE TABLE procurement_officers (
    emp_id              VARCHAR(20) PRIMARY KEY REFERENCES employees(emp_id),
    region              VARCHAR(50),
    authorization_limit DECIMAL(12,2)
);

CREATE TABLE quality_inspectors (
    emp_id              VARCHAR(20) PRIMARY KEY REFERENCES employees(emp_id),
    certification_ids   TEXT,       -- comma-separated cert IDs
    specialization      VARCHAR(100),
    digital_signature   VARCHAR(255)
);

CREATE TABLE supply_chain_managers (
    emp_id              VARCHAR(20) PRIMARY KEY REFERENCES employees(emp_id),
    product_lines       VARCHAR(200),
    reporting_level     VARCHAR(50)
);

CREATE TABLE equipment_engineers (
    emp_id              VARCHAR(20) PRIMARY KEY REFERENCES employees(emp_id),
    engineering_license VARCHAR(100),
    assigned_facility   VARCHAR(20) REFERENCES facilities(facility_id)
);

CREATE TABLE auditors (
    emp_id              VARCHAR(20) PRIMARY KEY REFERENCES employees(emp_id),
    regulatory_authority VARCHAR(100),
    accreditation_id    VARCHAR(50),
    audit_scope         VARCHAR(100)
);

-- ============================================================
-- DOMAIN 6: Audit Log
-- ============================================================

CREATE TABLE audit_logs (
    log_id          SERIAL PRIMARY KEY,
    emp_id          VARCHAR(20) REFERENCES employees(emp_id),
    action          VARCHAR(50) NOT NULL,    -- e.g. LOGIN, CREATE, UPDATE, DELETE, VIEW
    target_table    VARCHAR(50),
    target_record   VARCHAR(50),
    details         TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Auto audit trigger function (used by routes, not DB-level for flexibility)

-- ============================================================
-- INDEXES for performance
-- ============================================================

CREATE INDEX idx_orders_supplier   ON purchase_orders(supplier_id);
CREATE INDEX idx_orders_status     ON purchase_orders(status);
CREATE INDEX idx_shipments_order   ON shipments(order_id);
CREATE INDEX idx_certifications_part ON certifications(part_id);
CREATE INDEX idx_audit_emp         ON audit_logs(emp_id);
CREATE INDEX idx_audit_created     ON audit_logs(created_at);

-- ============================================================
-- VIEWS for dashboard queries
-- ============================================================

-- Supplier on-time delivery rate
CREATE OR REPLACE VIEW supplier_performance AS
SELECT
    s.supplier_id,
    s.business_name,
    COUNT(po.order_id)                                          AS total_orders,
    COUNT(CASE WHEN po.actual_delivery <= po.desired_delivery
               THEN 1 END)                                     AS on_time,
    ROUND(
        COUNT(CASE WHEN po.actual_delivery <= po.desired_delivery THEN 1 END)
        * 100.0 / NULLIF(COUNT(po.order_id), 0), 1
    )                                                           AS on_time_pct,
    COUNT(CASE WHEN po.status = 'completed' THEN 1 END)        AS completed_orders
FROM suppliers s
LEFT JOIN purchase_orders po ON s.supplier_id = po.supplier_id
GROUP BY s.supplier_id, s.business_name;

-- Delayed shipments
CREATE OR REPLACE VIEW delayed_shipments AS
SELECT
    sh.shipment_id,
    sh.order_id,
    sh.tracking_number,
    sh.eta,
    po.desired_delivery,
    po.supplier_id,
    s.business_name AS supplier_name,
    po.part_id,
    p.part_name,
    (sh.eta - po.desired_delivery) AS days_delayed
FROM shipments sh
JOIN purchase_orders po ON sh.order_id = po.order_id
JOIN suppliers s        ON po.supplier_id = s.supplier_id
JOIN parts p            ON po.part_id = p.part_id
WHERE sh.eta > po.desired_delivery
  AND sh.current_status != 'arrived';
