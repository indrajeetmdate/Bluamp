const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ofnwuifgzqjmmnsqsoed.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mbnd1aWZnenFqbW1uc3Fzb2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDQwODQsImV4cCI6MjEwMDM4MDA4NH0.J-EU8aFvlj1o6sMoWWJUJKbp8buMo4V8AbAmT7KkTz8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
    console.log('Seeding realistic Bluamp Energies operational data to Supabase...');

    // 1. Seed Company Profiles
    const companyProfiles = [
        {
            id: 'cp-apex-01',
            name: 'Apex Renewable Solutions Pvt Ltd',
            gstNumber: '27AABCA1234F1Z1',
            shippingAddress: 'Plot 42, Industrial Zone, MIDC Bhosari, Pune, MH - 411026',
            email: 'orders@apexrenewables.in',
            contactPerson: 'Rajesh Sharma',
            phoneNumber: '+91 98220 11223'
        },
        {
            id: 'cp-greengrid-02',
            name: 'GreenGrid Solar Dealers',
            gstNumber: '27XYZDE5678K1Z5',
            shippingAddress: 'Shop 12, Energy Complex, Station Road, Nashik, MH - 422001',
            email: 'sales@greengridsolar.com',
            contactPerson: 'Amit Deshmukh',
            phoneNumber: '+91 94230 44556'
        },
        {
            id: 'cp-bluamp-headquarters',
            name: 'Bluamp Energies Experience Centre',
            gstNumber: '27BLUAMP9999P1Z9',
            shippingAddress: 'Bluamp Energy Park, Phase II MIDC Chakan, Pune, MH - 410501',
            email: 'blueampcnergy@gmail.com',
            contactPerson: 'Director Operations',
            phoneNumber: '+91 20 6789 0000'
        }
    ];

    for (const cp of companyProfiles) {
        const { error } = await supabase.from('company_profiles').upsert(cp, { onConflict: 'id' });
        if (error) console.error('Error seeding company profile:', error.message);
    }
    console.log('✔ Company Profiles Seeded');

    // 2. Seed Received Goods (Raw Materials)
    const receivedGoods = [
        {
            id: 'rg-catl-280ah',
            name: 'CATL 3.2V 280Ah Prismatic LiFePO4 Cells',
            category: 'Cell',
            makeModel: 'CATL LF280K Grade A',
            supplier: 'Contemporary Amperex Tech (CATL)',
            quantity: 128,
            status: 'Done',
            damagedCount: 0,
            invoiceNumber: 'INV-CATL-2026-088',
            serials: Array.from({ length: 128 }, (_, i) => `CATL-280AH-${String(i + 1).padStart(4, '0')}`),
            timestamp: Date.now() - 86400000 * 5
        },
        {
            id: 'rg-eve-100ah',
            name: 'EVE 3.2V 100Ah Prismatic LiFePO4 Cells',
            category: 'Cell',
            makeModel: 'EVE LF100LA',
            supplier: 'EVE Energy Co.',
            quantity: 64,
            status: 'Done',
            damagedCount: 0,
            invoiceNumber: 'INV-EVE-2026-042',
            serials: Array.from({ length: 64 }, (_, i) => `EVE-100AH-${String(i + 1).padStart(4, '0')}`),
            timestamp: Date.now() - 86400000 * 3
        },
        {
            id: 'rg-jkbms-16s',
            name: 'Smart BMS 16S 48V 200A Bluetooth/CAN',
            category: 'BMS',
            makeModel: 'JK-BD6A24S20P',
            supplier: 'JK BMS Ltd',
            quantity: 16,
            status: 'Done',
            damagedCount: 0,
            invoiceNumber: 'INV-JKBMS-2026-105',
            serials: Array.from({ length: 16 }, (_, i) => `JKBMS-48V-${String(i + 1).padStart(3, '0')}`),
            timestamp: Date.now() - 86400000 * 4
        },
        {
            id: 'rg-enc-5kwh',
            name: 'Bluamp 5kWh Server Rack Battery Enclosure',
            category: 'Enclosure',
            makeModel: 'Bluamp SR-5000 Steel Case',
            supplier: 'Precision Sheet Metal Works',
            quantity: 10,
            status: 'Done',
            damagedCount: 0,
            invoiceNumber: 'INV-ENC-2026-77',
            serials: Array.from({ length: 10 }, (_, i) => `ENC-5KWH-${String(i + 1).padStart(3, '0')}`),
            timestamp: Date.now() - 86400000 * 2
        }
    ];

    for (const rg of receivedGoods) {
        const { error } = await supabase.from('received_goods').upsert(rg, { onConflict: 'id' });
        if (error) console.error('Error seeding received good:', error.message);
    }
    console.log('✔ Received Goods (Raw Materials) Seeded');

    // 3. Seed Product Recipes (BOMs)
    const recipes = [
        {
            id: 'recipe-bluamp-5kwh-pack',
            name: 'Bluamp PowerWall 5.12kWh 48V 100Ah Pack',
            components: [
                { masterItemName: 'CATL 3.2V 280Ah Prismatic LiFePO4 Cells', quantityPerUnit: 16 },
                { masterItemName: 'Smart BMS 16S 48V 200A Bluetooth/CAN', quantityPerUnit: 1 },
                { masterItemName: 'Bluamp 5kWh Server Rack Battery Enclosure', quantityPerUnit: 1 }
            ]
        },
        {
            id: 'recipe-bluamp-3-5kva-hups',
            name: 'Bluamp HUPS 3.5kVA Solar Hybrid Inverter',
            components: [
                { masterItemName: 'EVE 3.2V 100Ah Prismatic LiFePO4 Cells', quantityPerUnit: 8 }
            ]
        }
    ];

    for (const r of recipes) {
        const { error } = await supabase.from('recipes').upsert(r, { onConflict: 'id' });
        if (error) console.error('Error seeding recipe:', error.message);
    }
    console.log('✔ Recipes (Product SKUs) Seeded');

    // 4. Seed Storage Rooms & Units
    const storageRooms = [
        { id: 'room-cell-lab', name: 'Cell Grading & QC Testing Lab' },
        { id: 'room-fg-vault', name: 'Finished Goods Dispatch Warehouse' }
    ];
    for (const sroom of storageRooms) {
        const { error } = await supabase.from('storage_rooms').upsert(sroom, { onConflict: 'id' });
        if (error) console.error('Error seeding storage room:', error.message);
    }

    const storageUnits = [
        { id: 'unit-rack-a1', roomId: 'room-cell-lab', name: 'Rack A1 (Raw Cells)', type: 'Rack', sectionCount: 4 },
        { id: 'unit-rack-b2', roomId: 'room-fg-vault', name: 'Rack B2 (Finished Battery Packs)', type: 'Rack', sectionCount: 6 }
    ];
    for (const sunit of storageUnits) {
        const { error } = await supabase.from('storage_units').upsert(sunit, { onConflict: 'id' });
        if (error) console.error('Error seeding storage unit:', error.message);
    }
    console.log('✔ Storage Rooms & Units Seeded');

    // 5. Seed Employee Tasks
    const tasks = [
        {
            id: 'task-bluamp-01',
            assigned_to: 'blueampcnergy@gmail.com',
            title: '1C Rate Discharge Audit on 5.12kWh PowerWall Packs',
            description: 'Execute full 100A discharge test on completed batch #BLU-PW-5120.',
            completed: false,
            due_date: '2026-07-25',
            created_at: Date.now() - 3600000,
            created_by: 'blueampcnergy@gmail.com'
        },
        {
            id: 'task-bluamp-02',
            assigned_to: 'chitale',
            title: 'Impedance & Voltage Matching for CATL 280Ah Cells',
            description: 'Sort and log IR values for 128 cells in CATL Grade A shipment.',
            completed: true,
            due_date: '2026-07-24',
            created_at: Date.now() - 7200000,
            created_by: 'blueampcnergy@gmail.com'
        }
    ];

    for (const t of tasks) {
        const { error } = await supabase.from('employee_tasks').upsert(t, { onConflict: 'id' });
        if (error) console.error('Error seeding employee task:', error.message);
    }
    console.log('✔ Employee Tasks Seeded');

    console.log('🎉 Realistic Bluamp operational data seeding completed successfully!');
}

seed();
