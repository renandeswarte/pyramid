"""Editorial exclusions applied to both original and expanded candidate lists.

Keep geography fragments, personal names, overly specialized terms, and accidental
single-word fragments from entering the published decks. This is a conservative
playability review, not a claim about dictionary validity or scientific age ratings.
"""
EXCLUDED_WORDS = {
    'food': set('briquet sommelier medicament intolerant china'.split()),
    'animals': set('bitch jerboa kinkajou peccary waterbuck quetzal ptarmigan avocet wrasse nematode tortoiseshell swordtail springtail cetacean symbiosis veterinary guanaco eider walleye bloodhound nymph stud polar'.split()),
    'body': set('achilles cupid dna wisdom vocal little lob index canine premolar maxilla auricle cochlea dentine dentin uvula pharynx septum bronchus ureter urethra cranium cerebellum cerebrum cytoplasm hemoglobin haemoglobin platelet coccyx sacrum sacral lumbar cervical thoracic vertebral pectoral patella deltoid ulna humerus oxygenate secrete evacuate metabolic cardiovascular medicament salve scald spittle inoculation tourniquet gurney hypothermia psoriasis anesthetic anaesthetic anesthesia anaesthesia forceps ophthalmologist paediatrician neural synapse papilla'.split()),
    'geography': set('costa puerto burkina sanmarino blacksea maldiv es papua hochiminh abudhabi capetown addisababa daressalaam portlouis buenosaires sanjose lapaz saopaulo sanfrancisco sandiego losangeles lasvegas elsalvador equatorialguinea hot saudi'.split()),
    'kids': set('tuesday wednesday thursday friday saturday sunday monday january february march april may june july august september october november december rhyme fiber fibre batter'.split()),
    'teens': set('bong o kinetic soliloquy epithet foreword cytoplasm intranet firmware ethnography tulle'.split()),
    'everyday': set('rhizome tungsten forthwith wherein'.split()),
}
