// Small labelled sample set: [incident description, type, severity].
// English + Hinglish. Replace/extend with real labelled reports to improve the model.
export const DATASET = [
  // Accident
  ['Two bikes collided at the signal, riders have minor scratches', 'Accident', 'Low'],
  ['Car hit a divider, driver is conscious, traffic moving slowly', 'Accident', 'Medium'],
  ['Truck and car collision on highway, two people badly injured and bleeding', 'Accident', 'High'],
  ['Bus overturned with many passengers trapped inside, several unconscious', 'Accident', 'Critical'],
  ['Scooter skidded on wet road, rider has a leg injury', 'Accident', 'Medium'],
  ['Hit and run, pedestrian lying on the road not moving', 'Accident', 'Critical'],
  ['Minor fender bender in parking lot, no injuries', 'Accident', 'Low'],
  ['Auto rickshaw flipped, passengers injured need ambulance', 'Accident', 'High'],
  ['Bike slipped near flyover, small injury, person is walking', 'Accident', 'Low'],
  ['Head on collision between two cars, driver trapped, fuel leaking', 'Accident', 'Critical'],
  ['Gaadi ka accident ho gaya, do log ghayal hain', 'Accident', 'High'],
  ['Truck ne bike ko takkar maar di, khoon beh raha hai', 'Accident', 'High'],
  ['Car crashed into a tree, airbags opened, passengers shaken but fine', 'Accident', 'Medium'],
  ['Road accident near chowk, traffic jam, vehicles damaged only', 'Accident', 'Low'],
  // Fire
  ['Small fire in a dustbin near the market, smoke visible', 'Fire', 'Low'],
  ['Kitchen fire in a house, family evacuated safely', 'Fire', 'Medium'],
  ['Shop on fire, flames spreading to nearby shops, people running out', 'Fire', 'High'],
  ['Building on fire, people trapped on upper floors screaming for help', 'Fire', 'Critical'],
  ['Gas cylinder blast in restaurant, heavy flames, injured people', 'Fire', 'Critical'],
  ['Aag lag gayi godown mein, bahut dhuan hai', 'Fire', 'High'],
  ['Short circuit sparks on electric pole, smoke coming out', 'Fire', 'Medium'],
  ['Dry grass burning near highway, no houses nearby', 'Fire', 'Low'],
  ['Car engine caught fire on the road, driver got out safely', 'Fire', 'Medium'],
  ['Factory fire with chemical smell, explosion sounds, workers missing', 'Fire', 'Critical'],
  ['Smoke coming from apartment basement parking, residents alert', 'Fire', 'High'],
  ['Garbage heap burning, residents complaining about smoke', 'Fire', 'Low'],
  ['Ghar mein aag lagi hai, bachche andar fase hain', 'Fire', 'Critical'],
  ['Small fire in AC unit, put out by neighbours, needs a check', 'Fire', 'Low'],
  // Medical Emergency
  ['Elderly man fainted at the bus stop, now awake and talking', 'Medical Emergency', 'Medium'],
  ['Person collapsed, unresponsive and not breathing', 'Medical Emergency', 'Critical'],
  ['Chest pain and sweating with difficulty breathing, 55 year old man', 'Medical Emergency', 'Critical'],
  ['Woman in labour pain needs an ambulance urgently', 'Medical Emergency', 'High'],
  ['Child has high fever and vomiting since morning', 'Medical Emergency', 'Medium'],
  ['Man had a seizure, shaking, now unconscious', 'Medical Emergency', 'Critical'],
  ['Girl has a deep cut on her hand, bleeding but stable', 'Medical Emergency', 'Medium'],
  ['Food poisoning in a group, many people vomiting', 'Medical Emergency', 'High'],
  ['Minor allergy rash, itching, no breathing problem', 'Medical Emergency', 'Low'],
  ['Heart attack suspected, patient sweating and pale', 'Medical Emergency', 'Critical'],
  ['Mareez behosh ho gaya hai, saans nahi aa rahi', 'Medical Emergency', 'Critical'],
  ['Snake bite on the leg, swelling increasing, person scared', 'Medical Emergency', 'High'],
  ['Person slipped and twisted ankle, needs help walking', 'Medical Emergency', 'Low'],
  ['Overdose suspected, person drowsy and breathing slowly', 'Medical Emergency', 'Critical'],
  // Infrastructure Failure
  ['Water pipeline burst flooding the street', 'Infrastructure Failure', 'Medium'],
  ['Large pothole causing traffic problems', 'Infrastructure Failure', 'Low'],
  ['Electric pole fallen on the road with live wires', 'Infrastructure Failure', 'High'],
  ['Bridge crack widening while vehicles still pass', 'Infrastructure Failure', 'High'],
  ['Road caved in near the market, vehicle stuck in the hole', 'Infrastructure Failure', 'High'],
  ['Streetlights not working in the lane at night', 'Infrastructure Failure', 'Low'],
  ['Building wall collapsed, people may be under the debris', 'Infrastructure Failure', 'Critical'],
  ['Transformer exploded, power cut in the whole colony', 'Infrastructure Failure', 'Medium'],
  ['Sewage overflow on the road, bad smell', 'Infrastructure Failure', 'Low'],
  ['Tree fell on the road blocking traffic, no injuries', 'Infrastructure Failure', 'Medium'],
  ['Gas pipeline leak smell in the area, people worried', 'Infrastructure Failure', 'High'],
  ['Under construction slab collapsed, workers trapped', 'Infrastructure Failure', 'Critical'],
  ['Bijli ka taar toot kar sadak par gira hai', 'Infrastructure Failure', 'High'],
  ['Manhole cover missing on busy road, danger for vehicles', 'Infrastructure Failure', 'Medium'],
  // Other
  ['Suspicious bag left at the bus stand', 'Other', 'High'],
  ['Lost child crying near the temple, parents not found', 'Other', 'Medium'],
  ['Stray dogs attacking people in the lane', 'Other', 'Medium'],
  ['Loud fight between two groups, people throwing stones', 'Other', 'High'],
  ['Missing elderly person with memory problems, last seen in the morning', 'Other', 'High'],
  ['Person threatening to jump from a building', 'Other', 'Critical'],
  ['Stray cow stuck in a drain, needs rescue', 'Other', 'Low'],
  ['Noise complaint, loud music late at night', 'Other', 'Low'],
  ['Flooded underpass, people stuck in a car', 'Other', 'High'],
  ['Bacha kho gaya hai mela mein', 'Other', 'Medium'],
  ['Wild animal spotted near the colony, residents scared', 'Other', 'Medium'],
  ['Cat stuck on a tree', 'Other', 'Low'],
  ['Crowd stampede risk at event gate, pushing and shouting', 'Other', 'Critical'],
  ['Illegal parking blocking the ambulance route', 'Other', 'Low']
];

// Domain keyword priors (emergency-response vocabulary, English + Hinglish) used as extra training documents.
export const TYPE_LEXICON = [
  ['fire flames smoke burning blaze aag dhuan blast cylinder short circuit sparks', 'Fire'],
  ['accident collision crash collided hit bike car truck bus vehicle skidded overturned gaadi takkar road', 'Accident'],
  ['unconscious fainted breathing chest pain bleeding patient ambulance seizure heart fever vomiting mareez behosh saans', 'Medical Emergency'],
  ['pipeline burst pole wires pothole bridge collapsed transformer sewage manhole leak power cut bijli taar water', 'Infrastructure Failure'],
  ['suspicious lost missing stray dogs fight noise stampede crowd animal child kho gaya', 'Other']
];
export const SEVERITY_LEXICON = [
  ['trapped unconscious not breathing unresponsive explosion blast collapsed screaming jump stampede fatal dead critical missing workers', 'Critical'],
  ['injured bleeding spreading leak badly urgent live wires suspicious fight smoke people ghayal khoon', 'High'],
  ['stuck conscious damaged blocked traffic delay fever cut', 'Medium'],
  ['minor small scratches no injuries safely noise complaint pothole streetlights cat dustbin only', 'Low']
];
