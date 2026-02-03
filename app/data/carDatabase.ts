// Car brands and models database for autocomplete
export const CAR_DATABASE: { [brand: string]: string[] } = {
  'Volkswagen': [
    'Golf', 'Passat', 'Polo', 'Tiguan', 'Touareg', 'Arteon', 'T-Roc', 'T-Cross',
    'ID.3', 'ID.4', 'ID.5', 'Touran', 'Sharan', 'Caddy', 'Transporter', 'Jetta',
    'Beetle', 'Scirocco', 'Up!', 'Amarok'
  ],
  'Škoda': [
    'Octavia', 'Fabia', 'Superb', 'Kodiaq', 'Karoq', 'Kamiq', 'Scala', 'Rapid',
    'Citigo', 'Roomster', 'Yeti', 'Enyaq', 'Enyaq Coupé', 'Elroq'
  ],
  'BMW': [
    'Series 1', 'Series 2', 'Series 3', 'Series 4', 'Series 5', 'Series 6', 'Series 7', 'Series 8',
    'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'Z4', 'i3', 'i4', 'iX', 'iX3',
    'M3', 'M4', 'M5', 'M8'
  ],
  'Mercedes-Benz': [
    'A-Class', 'B-Class', 'C-Class', 'E-Class', 'S-Class', 'CLA', 'CLS',
    'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'G-Class', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS',
    'AMG GT', 'SL', 'Vito', 'Sprinter'
  ],
  'Audi': [
    'A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8',
    'Q2', 'Q3', 'Q4 e-tron', 'Q5', 'Q7', 'Q8',
    'TT', 'R8', 'e-tron', 'e-tron GT',
    'S3', 'S4', 'S5', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7'
  ],
  'Toyota': [
    'Yaris', 'Corolla', 'Camry', 'Prius', 'RAV4', 'Land Cruiser', 'Highlander',
    'C-HR', 'Aygo', 'Supra', 'GR86', 'Hilux', 'Proace', 'bZ4X'
  ],
  'Ford': [
    'Fiesta', 'Focus', 'Mondeo', 'Mustang', 'Mustang Mach-E', 'Puma', 'Kuga',
    'Explorer', 'Ranger', 'Transit', 'S-Max', 'Galaxy', 'EcoSport', 'Bronco'
  ],
  'Honda': [
    'Civic', 'Accord', 'Jazz', 'HR-V', 'CR-V', 'e', 'ZR-V', 'City', 'NSX'
  ],
  'Hyundai': [
    'i10', 'i20', 'i30', 'i40', 'Kona', 'Tucson', 'Santa Fe', 'Ioniq', 'Ioniq 5', 'Ioniq 6',
    'Bayon', 'Nexo', 'Staria'
  ],
  'Kia': [
    'Picanto', 'Rio', 'Ceed', 'ProCeed', 'XCeed', 'Stonic', 'Sportage', 'Sorento',
    'Niro', 'EV6', 'EV9', 'Stinger'
  ],
  'Renault': [
    'Clio', 'Megane', 'Captur', 'Kadjar', 'Austral', 'Arkana', 'Scenic', 'Espace',
    'Talisman', 'Twingo', 'Zoe', 'Megane E-Tech', 'Kangoo', 'Master'
  ],
  'Peugeot': [
    '108', '208', '308', '408', '508', '2008', '3008', '5008',
    'e-208', 'e-308', 'e-2008', 'e-3008', 'Rifter', 'Traveller', 'Partner'
  ],
  'Citroën': [
    'C1', 'C3', 'C3 Aircross', 'C4', 'C4 X', 'C5 X', 'C5 Aircross',
    'Berlingo', 'SpaceTourer', 'ë-C4', 'Ami'
  ],
  'Opel': [
    'Corsa', 'Astra', 'Insignia', 'Crossland', 'Grandland', 'Mokka',
    'Combo', 'Vivaro', 'Zafira', 'Rocks-e'
  ],
  'Mazda': [
    '2', '3', '6', 'CX-3', 'CX-30', 'CX-5', 'CX-60', 'CX-80', 'MX-5', 'MX-30'
  ],
  'Nissan': [
    'Micra', 'Juke', 'Qashqai', 'X-Trail', 'Leaf', 'Ariya', 'Navara', 'Townstar',
    '370Z', 'GT-R'
  ],
  'Volvo': [
    'S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90', 'C40',
    'EX30', 'EX90', 'XC40 Recharge'
  ],
  'Fiat': [
    '500', '500X', '500L', 'Panda', 'Tipo', 'Punto', 'Doblo', 'Ducato', '500e'
  ],
  'Seat': [
    'Ibiza', 'Leon', 'Arona', 'Ateca', 'Tarraco', 'Mii', 'Toledo', 'Alhambra'
  ],
  'Cupra': [
    'Born', 'Formentor', 'Leon', 'Ateca', 'Tavascan'
  ],
  'Dacia': [
    'Sandero', 'Logan', 'Duster', 'Jogger', 'Spring'
  ],
  'Tesla': [
    'Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck', 'Roadster'
  ],
  'Porsche': [
    '911', '718 Cayman', '718 Boxster', 'Cayenne', 'Macan', 'Panamera', 'Taycan'
  ],
  'Jeep': [
    'Renegade', 'Compass', 'Cherokee', 'Grand Cherokee', 'Wrangler', 'Gladiator', 'Avenger'
  ],
  'Land Rover': [
    'Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Sport',
    'Range Rover Velar', 'Range Rover Evoque'
  ],
  'Jaguar': [
    'XE', 'XF', 'F-Type', 'E-Pace', 'F-Pace', 'I-Pace'
  ],
  'Mini': [
    'Cooper', 'Cooper S', 'Clubman', 'Countryman', 'Cabrio', 'Electric'
  ],
  'Alfa Romeo': [
    'Giulia', 'Stelvio', 'Tonale', 'Giulietta', '4C'
  ],
  'Subaru': [
    'Impreza', 'XV', 'Forester', 'Outback', 'Levorg', 'BRZ', 'Solterra', 'WRX'
  ],
  'Suzuki': [
    'Swift', 'Ignis', 'Vitara', 'S-Cross', 'Jimny', 'Swace', 'Across'
  ],
  'Mitsubishi': [
    'Space Star', 'ASX', 'Eclipse Cross', 'Outlander', 'L200'
  ],
  'Ferrari': [
    '488', 'F8 Tributo', 'Roma', 'Portofino', '812 Superfast', 'SF90 Stradale', '296 GTB', 'Purosangue', 'LaFerrari', 'Enzo', 'F40'
  ],
  'Chevrolet': [
    'Corvette', 'Camaro', 'Spark', 'Aveo', 'Malibu', 'Cruze', 'Trax', 'Captiva', 'Tahoe', 'Suburban', 'Silverado', 'Bolt', 'Orlando'
  ],
  'Corvette': [
    'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'Stingray', 'Z06', 'ZR1', 'E-Ray'
  ],
  'Lamborghini': [
    'Huracán', 'Aventador', 'Urus', 'Revuelto', 'Countach', 'Diablo', 'Murciélago', 'Gallardo'
  ],
  'Dodge': [
    'Challenger', 'Charger', 'Durango', 'Viper', 'Hornet', 'Journey', 'Dart', 'Avenger'
  ],
  'RAM': [
    '1500', '2500', '3500', 'Promaster'
  ],
  'Maserati': [
    'Ghibli', 'Levante', 'Quattroporte', 'MC20', 'GranTurismo', 'Grecale'
  ],
  'Bentley': [
    'Continental GT', 'Flying Spur', 'Bentayga'
  ],
  'Rolls-Royce': [
    'Phantom', 'Ghost', 'Wraith', 'Dawn', 'Cullinan', 'Spectre'
  ],
};

// Get brand suggestions based on query
export function getBrandSuggestions(query: string): string[] {
  if (!query || query.length < 1) return [];
  
  const lowerQuery = query.toLowerCase();
  const brands = Object.keys(CAR_DATABASE);
  
  // Exact starts with first, then contains
  const startsWithMatches = brands.filter(b => 
    b.toLowerCase().startsWith(lowerQuery)
  );
  const containsMatches = brands.filter(b => 
    b.toLowerCase().includes(lowerQuery) && !b.toLowerCase().startsWith(lowerQuery)
  );
  
  return [...startsWithMatches, ...containsMatches].slice(0, 8);
}

// Get model suggestions based on brand and query
export function getModelSuggestions(brand: string, query: string): string[] {
  if (!brand) return [];
  
  // Find the brand (case insensitive)
  const brandKey = Object.keys(CAR_DATABASE).find(
    b => b.toLowerCase() === brand.toLowerCase()
  );
  
  if (!brandKey) return [];
  
  const models = CAR_DATABASE[brandKey];
  
  if (!query || query.length < 1) return models.slice(0, 10);
  
  const lowerQuery = query.toLowerCase();
  
  // Exact starts with first, then contains
  const startsWithMatches = models.filter(m => 
    m.toLowerCase().startsWith(lowerQuery)
  );
  const containsMatches = models.filter(m => 
    m.toLowerCase().includes(lowerQuery) && !m.toLowerCase().startsWith(lowerQuery)
  );
  
  return [...startsWithMatches, ...containsMatches].slice(0, 8);
}

// Parse user input to suggest brand and model
export function parseCarInput(input: string): { brand?: string; model?: string } {
  if (!input) return {};
  
  const lowerInput = input.toLowerCase();
  const brands = Object.keys(CAR_DATABASE);
  
  // Common abbreviations
  const abbreviations: { [key: string]: string } = {
    'vw': 'Volkswagen',
    'mb': 'Mercedes-Benz',
    'merc': 'Mercedes-Benz',
    'mercedes': 'Mercedes-Benz',
    'bmw': 'BMW',
    'skoda': 'Škoda',
    'chevy': 'Chevrolet',
  };
  
  // Check abbreviations first
  const words = lowerInput.split(/\s+/);
  let matchedBrand: string | undefined;
  let remainingWords: string[] = [];
  
  for (const abbr of Object.keys(abbreviations)) {
    if (words[0] === abbr) {
      matchedBrand = abbreviations[abbr];
      remainingWords = words.slice(1);
      break;
    }
  }
  
  // If no abbreviation matched, check full brand names
  if (!matchedBrand) {
    for (const brand of brands) {
      const brandLower = brand.toLowerCase();
      if (lowerInput.startsWith(brandLower + ' ')) {
        matchedBrand = brand;
        remainingWords = lowerInput.slice(brandLower.length + 1).split(/\s+/).filter(w => w);
        break;
      }
      if (lowerInput === brandLower) {
        matchedBrand = brand;
        remainingWords = [];
        break;
      }
    }
  }
  
  if (!matchedBrand) return {};
  
  // Try to match model from remaining words
  const modelQuery = remainingWords.join(' ');
  let matchedModel: string | undefined;
  
  if (modelQuery && CAR_DATABASE[matchedBrand]) {
    const models = CAR_DATABASE[matchedBrand];
    const exactMatch = models.find(m => m.toLowerCase() === modelQuery);
    if (exactMatch) {
      matchedModel = exactMatch;
    } else {
      const partialMatch = models.find(m => 
        m.toLowerCase().startsWith(modelQuery.toLowerCase())
      );
      if (partialMatch) {
        matchedModel = partialMatch;
      }
    }
  }
  
  return { brand: matchedBrand, model: matchedModel };
}
