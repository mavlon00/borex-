export interface CatalogAppliance {
  name: string;
  watts: number;
  surge: number;
  category: string;
  defaultHours?: number;
  defaultPeriod?: 'Day' | 'Night' | 'Both';
  defaultCritical?: boolean;
}

export const APPLIANCE_CATALOG: CatalogAppliance[] = [
  // Cooling & Climate
  { name: 'AC 1 HP', watts: 900, surge: 2.5, category: 'Cooling', defaultHours: 6, defaultPeriod: 'Night' },
  { name: 'AC 1.5 HP', watts: 1300, surge: 2.5, category: 'Cooling', defaultHours: 6, defaultPeriod: 'Night' },
  { name: 'AC 2 HP', watts: 1800, surge: 2.5, category: 'Cooling', defaultHours: 5, defaultPeriod: 'Night' },
  { name: 'Inverter AC 1 HP', watts: 650, surge: 1.5, category: 'Cooling', defaultHours: 8, defaultPeriod: 'Night' },
  { name: 'Inverter AC 1.5 HP', watts: 1000, surge: 1.5, category: 'Cooling', defaultHours: 8, defaultPeriod: 'Night' },
  { name: 'Inverter AC 2 HP', watts: 1400, surge: 1.5, category: 'Cooling', defaultHours: 7, defaultPeriod: 'Night' },
  { name: 'Ceiling Fan', watts: 75, surge: 1, category: 'Cooling', defaultHours: 10, defaultPeriod: 'Both' },
  { name: 'Standing Fan', watts: 80, surge: 1, category: 'Cooling', defaultHours: 8, defaultPeriod: 'Both' },
  { name: 'OX / Industrial Standing Fan', watts: 120, surge: 1.2, category: 'Cooling', defaultHours: 8, defaultPeriod: 'Day' },
  { name: 'Wall Mount Fan', watts: 60, surge: 1, category: 'Cooling', defaultHours: 8, defaultPeriod: 'Both' },

  // Refrigeration & Kitchen
  { name: 'Refrigerator (Single Door)', watts: 120, surge: 3, category: 'Kitchen', defaultHours: 24, defaultPeriod: 'Both', defaultCritical: true },
  { name: 'Refrigerator (Double Door)', watts: 180, surge: 3, category: 'Kitchen', defaultHours: 24, defaultPeriod: 'Both', defaultCritical: true },
  { name: 'Side-by-Side Inverter Fridge', watts: 220, surge: 1.8, category: 'Kitchen', defaultHours: 24, defaultPeriod: 'Both', defaultCritical: true },
  { name: 'Deep Freezer (Chest)', watts: 250, surge: 3, category: 'Kitchen', defaultHours: 24, defaultPeriod: 'Both', defaultCritical: true },
  { name: 'Inverter Deep Freezer', watts: 160, surge: 1.8, category: 'Kitchen', defaultHours: 24, defaultPeriod: 'Both', defaultCritical: true },
  { name: 'Microwave Oven', watts: 1200, surge: 1.2, category: 'Kitchen', defaultHours: 0.5, defaultPeriod: 'Day' },
  { name: 'Air Fryer', watts: 1500, surge: 1.1, category: 'Kitchen', defaultHours: 0.5, defaultPeriod: 'Day' },
  { name: 'Electric Kettle', watts: 1800, surge: 1, category: 'Kitchen', defaultHours: 0.3, defaultPeriod: 'Day' },
  { name: 'Electric Cooker / Induction Plate', watts: 2000, surge: 1, category: 'Kitchen', defaultHours: 1.5, defaultPeriod: 'Day' },
  { name: 'Electric Oven', watts: 2400, surge: 1, category: 'Kitchen', defaultHours: 1, defaultPeriod: 'Day' },
  { name: 'Blender / Food Processor', watts: 400, surge: 2, category: 'Kitchen', defaultHours: 0.3, defaultPeriod: 'Day' },
  { name: 'Heavy Duty Commercial Blender', watts: 1500, surge: 2.2, category: 'Kitchen', defaultHours: 0.5, defaultPeriod: 'Day' },
  { name: 'Toaster', watts: 800, surge: 1, category: 'Kitchen', defaultHours: 0.2, defaultPeriod: 'Day' },
  { name: 'Espresso / Coffee Machine', watts: 1300, surge: 1.1, category: 'Kitchen', defaultHours: 0.4, defaultPeriod: 'Day' },
  { name: 'Water Dispenser (Hot & Cold)', watts: 550, surge: 1.8, category: 'Kitchen', defaultHours: 12, defaultPeriod: 'Day' },
  { name: 'Dishwasher', watts: 1400, surge: 1.5, category: 'Kitchen', defaultHours: 1.5, defaultPeriod: 'Day' },

  // Water & Pumps
  { name: 'Water Pump 0.5 HP', watts: 375, surge: 3, category: 'Pumps', defaultHours: 1, defaultPeriod: 'Day' },
  { name: 'Water Pump 1 HP', watts: 750, surge: 3, category: 'Pumps', defaultHours: 1, defaultPeriod: 'Day' },
  { name: 'Water Pump 1.5 HP', watts: 1100, surge: 3, category: 'Pumps', defaultHours: 1, defaultPeriod: 'Day' },
  { name: 'Water Pump 2 HP', watts: 1500, surge: 3, category: 'Pumps', defaultHours: 1, defaultPeriod: 'Day' },
  { name: 'Automatic Pressure Booster Pump', watts: 450, surge: 2.5, category: 'Pumps', defaultHours: 2, defaultPeriod: 'Day' },
  { name: 'Swimming Pool Pump', watts: 1500, surge: 2.5, category: 'Pumps', defaultHours: 4, defaultPeriod: 'Day' },
  { name: 'Borehole Submersible Pump', watts: 1100, surge: 3, category: 'Pumps', defaultHours: 1.5, defaultPeriod: 'Day' },
  { name: 'Water Heater / Geyser (15L - 30L)', watts: 1500, surge: 1, category: 'Pumps', defaultHours: 1, defaultPeriod: 'Day' },
  { name: 'Water Heater / Geyser (50L - 100L)', watts: 2500, surge: 1, category: 'Pumps', defaultHours: 1.5, defaultPeriod: 'Day' },

  // Home & Laundry
  { name: 'Washing Machine (Front Load)', watts: 500, surge: 2, category: 'Laundry', defaultHours: 1, defaultPeriod: 'Day' },
  { name: 'Washing Machine (Top Load)', watts: 400, surge: 2, category: 'Laundry', defaultHours: 1, defaultPeriod: 'Day' },
  { name: 'Clothes Dryer', watts: 2500, surge: 1.2, category: 'Laundry', defaultHours: 1, defaultPeriod: 'Day' },
  { name: 'Electric Clothes Iron', watts: 1200, surge: 1, category: 'Laundry', defaultHours: 0.75, defaultPeriod: 'Day' },
  { name: 'Steam Press Iron', watts: 1800, surge: 1, category: 'Laundry', defaultHours: 0.75, defaultPeriod: 'Day' },
  { name: 'Vacuum Cleaner', watts: 1400, surge: 1.8, category: 'Laundry', defaultHours: 0.5, defaultPeriod: 'Day' },
  { name: 'Hair Dryer', watts: 1600, surge: 1.2, category: 'Laundry', defaultHours: 0.3, defaultPeriod: 'Day' },

  // Electronics & Office
  { name: 'LED TV 32"-43"', watts: 65, surge: 1, category: 'Electronics', defaultHours: 6, defaultPeriod: 'Night' },
  { name: 'Smart TV 55"-65"', watts: 120, surge: 1, category: 'Electronics', defaultHours: 6, defaultPeriod: 'Night' },
  { name: 'Large OLED TV 75"+', watts: 200, surge: 1, category: 'Electronics', defaultHours: 5, defaultPeriod: 'Night' },
  { name: 'Decoder / Cable Box (DSTV)', watts: 20, surge: 1, category: 'Electronics', defaultHours: 6, defaultPeriod: 'Night', defaultCritical: true },
  { name: 'Home Theater / Soundbar', watts: 120, surge: 1.2, category: 'Electronics', defaultHours: 4, defaultPeriod: 'Night' },
  { name: 'Laptop Computer', watts: 65, surge: 1, category: 'Electronics', defaultHours: 8, defaultPeriod: 'Both', defaultCritical: true },
  { name: 'Desktop PC + Monitor', watts: 220, surge: 1, category: 'Electronics', defaultHours: 8, defaultPeriod: 'Day' },
  { name: 'High-End Gaming PC', watts: 650, surge: 1.2, category: 'Electronics', defaultHours: 5, defaultPeriod: 'Night' },
  { name: 'Gaming Console (PS5 / Xbox)', watts: 200, surge: 1, category: 'Electronics', defaultHours: 4, defaultPeriod: 'Night' },
  { name: 'Wi-Fi Router / Fiber Modem', watts: 20, surge: 1, category: 'Electronics', defaultHours: 24, defaultPeriod: 'Both', defaultCritical: true },
  { name: 'Starlink Satellite Terminal', watts: 75, surge: 1, category: 'Electronics', defaultHours: 24, defaultPeriod: 'Both', defaultCritical: true },
  { name: 'Office Printer / Photocopier', watts: 450, surge: 1.5, category: 'Electronics', defaultHours: 2, defaultPeriod: 'Day' },
  { name: 'POS Terminal', watts: 30, surge: 1, category: 'Electronics', defaultHours: 12, defaultPeriod: 'Day', defaultCritical: true },

  // Lighting & Security
  { name: 'LED Light Bulb (9W-12W)', watts: 12, surge: 1, category: 'Lighting', defaultHours: 8, defaultPeriod: 'Night', defaultCritical: true },
  { name: 'LED Tube Light (18W)', watts: 18, surge: 1, category: 'Lighting', defaultHours: 8, defaultPeriod: 'Night', defaultCritical: true },
  { name: 'Outdoor Security Floodlight (50W)', watts: 50, surge: 1, category: 'Lighting', defaultHours: 10, defaultPeriod: 'Night', defaultCritical: true },
  { name: 'High-Power LED Floodlight (100W)', watts: 100, surge: 1, category: 'Lighting', defaultHours: 10, defaultPeriod: 'Night' },
  { name: 'CCTV Camera System + DVR/NVR', watts: 80, surge: 1, category: 'Security', defaultHours: 24, defaultPeriod: 'Both', defaultCritical: true },
  { name: 'Electric Fence Energizer', watts: 25, surge: 1, category: 'Security', defaultHours: 24, defaultPeriod: 'Both', defaultCritical: true },
  { name: 'Automatic Gate Motor', watts: 350, surge: 2.5, category: 'Security', defaultHours: 0.5, defaultPeriod: 'Day' },
  { name: 'Intercom / Video Doorbell', watts: 15, surge: 1, category: 'Security', defaultHours: 24, defaultPeriod: 'Both', defaultCritical: true },

  // Medical & Special
  { name: 'Oxygen Concentrator (Medical)', watts: 400, surge: 1.5, category: 'Medical', defaultHours: 16, defaultPeriod: 'Both', defaultCritical: true },
  { name: 'Nebulizer Machine', watts: 80, surge: 1.2, category: 'Medical', defaultHours: 1, defaultPeriod: 'Day' },
  { name: 'CPAP Machine', watts: 60, surge: 1, category: 'Medical', defaultHours: 8, defaultPeriod: 'Night', defaultCritical: true }
];
