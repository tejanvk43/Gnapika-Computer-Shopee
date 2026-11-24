// types/index.ts
export interface Organization {
    id: string;
    name: string;
}

export interface Branch {
    id: string;
    organization_id: string;
    name: string;
}

export interface UserProfile {
    id: string;
    organization_id: string;
    email: string;
    full_name: string;
}

export interface Customer {
    id: string;
    organization_id: string;
    customer_name: string;
    phone_number: string | null;
    alt_phone_number: string | null;
    email: string | null;
    address: string | null;
    gstin: string | null;
    created_at: string;
}

export interface Product {
    id: string;
    organization_id: string;
    category_id: string | null;
    sku: string;
    name: string;
    description: string | null;
    created_at: string;
}

export interface ProductCategory {
    id: string;
    organization_id: string;
    name: string;
}

export interface ProductBarcode {
    product_id: string;
    barcode_value: string;
    barcode_type: string;
}
