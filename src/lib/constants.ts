export const VEHICLE_CATEGORIES = [
  'Exterior Of Car',
  'Car Interior',
  'Motorcycles',
  'Window Film',
  'Mobile electronic equipment',
  'Pattern Logo Engraving',
  'Car partial protection kit',
  'External sunroof tint film',
] as const;

export type VehicleCategory = typeof VEHICLE_CATEGORIES[number];
