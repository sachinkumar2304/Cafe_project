-- Locations
CREATE TABLE IF NOT EXISTS locations (
  id varchar(50) PRIMARY KEY,
  name varchar(255) NOT NULL,
  address text,
  highlights text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id bigserial PRIMARY KEY,
  name varchar(255) NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  category varchar(100) NOT NULL,
  is_veg boolean DEFAULT true,
  is_available boolean DEFAULT true,
  image_url text,
  location_id varchar(50) REFERENCES locations(id),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Users (linked with Firebase UID)
CREATE TABLE IF NOT EXISTS users (
  id bigserial PRIMARY KEY,
  firebase_uid varchar(255) UNIQUE,
  email varchar(255),
  phone varchar(20),
  name varchar(255),
  created_at timestamp DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id bigserial PRIMARY KEY,
  user_id bigint REFERENCES users(id),
  location_id varchar(50) REFERENCES locations(id),
  total_amount numeric(10,2) NOT NULL,
  delivery_charge numeric(10,2) DEFAULT 0,
  status varchar(50) DEFAULT 'pending',
  created_at timestamp DEFAULT now()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id bigserial PRIMARY KEY,
  order_id bigint REFERENCES orders(id),
  menu_item_id bigint REFERENCES menu_items(id),
  quantity int NOT NULL,
  price numeric(10,2) NOT NULL
);

-- Admin backup mapping
CREATE TABLE IF NOT EXISTS admins (
  id bigserial PRIMARY KEY,
  firebase_uid varchar(255) UNIQUE NOT NULL,
  role varchar(50) DEFAULT 'super_admin',
  created_at timestamp DEFAULT now()
);




