-- Bazario MySQL schema. Use `npm run migrate`; this file is also suitable for
-- provisioning an empty database. Migrations never drop or truncate data.

CREATE TABLE IF NOT EXISTS buyers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NULL,
  interests JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sellers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NULL,
  shop_description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seller_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  price INT NOT NULL,
  description TEXT,
  image_urls JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  buyer_id INT NOT NULL,
  seller_id INT NULL,
  parent_order_id INT NULL,
  total_price INT NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'Confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES buyers(id),
  FOREIGN KEY (seller_id) REFERENCES sellers(id),
  FOREIGN KEY (parent_order_id) REFERENCES orders(id) ON DELETE CASCADE,
  KEY idx_orders_buyer_created (buyer_id, created_at),
  KEY idx_orders_seller_status (seller_id, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price INT NOT NULL,
  UNIQUE KEY uq_order_product (order_id, product_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cart (
  id INT AUTO_INCREMENT PRIMARY KEY,
  buyer_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  UNIQUE KEY uq_cart_buyer_product (buyer_id, product_id),
  FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wishlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  buyer_id INT NOT NULL,
  product_id INT NOT NULL,
  UNIQUE KEY uq_wishlist_buyer_product (buyer_id, product_id),
  FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Phase 2: buyer -> shop follow relationship.
-- UNIQUE(buyer_id, seller_id) prevents duplicate follow records at the
-- database level (in addition to backend validation).
CREATE TABLE IF NOT EXISTS follows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  buyer_id INT NOT NULL,
  seller_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_follows_buyer_seller (buyer_id, seller_id),
  FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auth_identities (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(32) NOT NULL,
  provider_subject VARCHAR(255) NOT NULL,
  role ENUM('buyer', 'seller') NOT NULL,
  buyer_id INT NULL,
  seller_id INT NULL,
  email VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_identity_provider_subject (provider, provider_subject),
  UNIQUE KEY uq_identity_buyer_role (buyer_id, role),
  UNIQUE KEY uq_identity_seller_role (seller_id, role),
  FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
  CONSTRAINT chk_identity_owner CHECK ((role = 'buyer' AND buyer_id IS NOT NULL AND seller_id IS NULL) OR (role = 'seller' AND seller_id IS NOT NULL AND buyer_id IS NULL)),
  KEY idx_identity_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS buyer_interests (
  buyer_id INT NOT NULL,
  interest VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (buyer_id, interest),
  FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS behavioral_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  buyer_id INT NULL,
  seller_id INT NULL,
  product_id INT NULL,
  event_type VARCHAR(64) NOT NULL,
  event_key VARCHAR(191) NULL,
  metadata JSON NULL,
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_behavioral_event_key (event_key),
  KEY idx_behavioral_buyer_time (buyer_id, occurred_at),
  KEY idx_behavioral_product_time (product_id, occurred_at),
  FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE SET NULL,
  FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS purchase_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  buyer_id INT NOT NULL,
  parent_order_id INT NOT NULL,
  idempotency_key VARCHAR(191) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_purchase_idempotency (buyer_id, idempotency_key),
  UNIQUE KEY uq_purchase_order (parent_order_id),
  FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;
