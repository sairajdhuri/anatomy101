export interface StudyNote {
  title: string;
  names: string[];
  location: string;
  function: string;
  supply: string;
  innervation: string;
  recall: string;
  reference: string;
  url: string;
}

export const STUDY_NOTES: StudyNote[] = [
  {
    title: 'Heart', names: ['heart'],
    location: 'Within the middle mediastinum, enclosed by the pericardium; the apex points inferiorly and to the left.',
    function: 'The right ventricle drives the pulmonary circuit. The left ventricle drives the systemic circuit. Valves direct flow between chambers and great vessels.',
    supply: 'Right and left coronary arteries arise from the aortic root. The left main divides into the anterior interventricular and circumflex branches. Most venous return enters the coronary sinus.',
    innervation: 'Sympathetic and vagal fibers reach the heart through the cardiac plexus and modulate rate and conduction.',
    recall: 'Trace the coronary sulcus and interventricular grooves. Coronary dominance describes the origin of the posterior interventricular artery.',
    reference: 'StatPearls · Anatomy, Thorax, Heart', url: 'https://www.ncbi.nlm.nih.gov/books/NBK470256/',
  },
  {
    title: 'Lungs', names: ['lung', 'right lung', 'left lung', 'lungs'],
    location: 'In the right and left pleural cavities, on either side of the mediastinum; the bases rest on the diaphragm.',
    function: 'Conducting airways distribute air to respiratory units. Alveoli exchange oxygen and carbon dioxide with pulmonary capillary blood.',
    supply: 'Pulmonary arteries supply the gas-exchange circulation. Bronchial arteries supply supporting tissues. Pulmonary veins return oxygenated blood to the left atrium.',
    innervation: 'Pulmonary plexuses contain autonomic fibers. Vagal activity promotes bronchoconstriction and glandular secretion.',
    recall: 'Compare three right lobes with two left lobes. Identify the hilum, fissures, and the left cardiac notch.',
    reference: 'StatPearls · Anatomy, Thorax, Lungs', url: 'https://www.ncbi.nlm.nih.gov/books/NBK470197/',
  },
  {
    title: 'Kidneys', names: ['kidney', 'right kidney', 'left kidney', 'kidneys'],
    location: 'Retroperitoneal, on the posterior abdominal wall. The right kidney generally lies lower than the left because of the liver.',
    function: 'Filter blood and regulate fluid, electrolytes, and acid–base balance. Endocrine roles include renin and erythropoietin release.',
    supply: 'Renal arteries arise from the abdominal aorta. Renal veins drain to the inferior vena cava. Segmental arterial territories have limited collateral supply.',
    innervation: 'Autonomic fibers reach the kidneys through the renal plexus; sympathetic activity influences renal vascular tone and renin release.',
    recall: 'At the renal hilum, the vein generally lies anterior to the artery, with the pelvis posterior. Compare anterior relations on each side.',
    reference: 'StatPearls · Anatomy, Abdomen and Pelvis: Kidneys', url: 'https://www.ncbi.nlm.nih.gov/books/NBK482385/',
  },
  {
    title: 'Pancreas', names: ['pancreas'],
    location: 'Across the upper posterior abdomen, behind the stomach. The head sits within the duodenal curve; the tail approaches the splenic hilum.',
    function: 'Acinar tissue produces digestive secretions. Islets release hormones, including insulin and glucagon, into the circulation.',
    supply: 'The head receives pancreaticoduodenal branches. Splenic artery branches supply much of the body and tail; venous drainage reaches the portal system.',
    innervation: 'Sympathetic and parasympathetic fibers reach the gland through abdominal autonomic plexuses.',
    recall: 'Find the head, neck, body, and tail. Review the relation of the neck to the portal venous confluence.',
    reference: 'StatPearls · Anatomy, Abdomen and Pelvis, Pancreas', url: 'https://www.ncbi.nlm.nih.gov/books/NBK532912/',
  },
  {
    title: 'Diaphragm', names: ['diaphragm', 'thoracic diaphragm'],
    location: 'A muscular sheet between thorax and abdomen; peripheral fibers converge on the central tendon.',
    function: 'Contraction lowers the central tendon, increases thoracic volume, and draws air into the lungs.',
    supply: 'Phrenic and musculophrenic arteries, with contributions from lower intercostal and subcostal arteries.',
    innervation: 'Phrenic nerves (C3–C5) provide motor supply and central sensation. Lower intercostal nerves supply peripheral sensation.',
    recall: 'Recall major openings: inferior vena cava at T8, esophagus at T10, aorta at T12. These levels are reference landmarks.',
    reference: 'StatPearls · Anatomy, Thorax: Diaphragm', url: 'https://www.ncbi.nlm.nih.gov/books/NBK519558/',
  },
  {
    title: 'Spleen', names: ['spleen'],
    location: 'In the left upper abdomen, beneath the diaphragm, near ribs 9–11; related to the stomach, left kidney, and pancreatic tail.',
    function: 'Filters blood, removes aging erythrocytes, and supports immune responses through lymphoid tissue.',
    supply: 'The splenic artery arises from the celiac trunk. The splenic vein contributes to formation of the portal vein.',
    innervation: 'Sympathetic fibers accompany splenic vessels from the celiac plexus.',
    recall: 'Review the gastrosplenic and splenorenal ligaments and their contents. Locate the pancreatic tail near the hilum.',
    reference: 'StatPearls · Anatomy, Abdomen and Pelvis, Spleen', url: 'https://www.ncbi.nlm.nih.gov/books/NBK482235/',
  },
  {
    title: 'Trachea', names: ['trachea'],
    location: 'From the lower larynx in the neck into the superior mediastinum, anterior to the esophagus, ending at the carina.',
    function: 'Conducts air into the main bronchi. Cartilage supports its lumen; the posterior membranous wall permits flexibility.',
    supply: 'The cervical portion receives branches of the inferior thyroid arteries; bronchial vessels contribute to the thoracic portion.',
    innervation: 'Autonomic fibers include vagal and sympathetic contributions.',
    recall: 'Identify the posterior membranous wall and the main bronchi. The thyroid and recurrent laryngeal nerves are important neighboring structures.',
    reference: 'StatPearls · Anatomy, Head and Neck, Trachea', url: 'https://www.ncbi.nlm.nih.gov/books/NBK448070/',
  },
  {
    title: 'Thyroid', names: ['thyroid gland', 'thyroid'],
    location: 'In the anterior neck, with two lobes on either side of the upper trachea connected by an isthmus.',
    function: 'Follicular cells produce thyroid hormones. Parafollicular cells produce calcitonin.',
    supply: 'Superior and inferior thyroid arteries. Venous drainage includes superior, middle, and inferior thyroid veins.',
    innervation: 'Autonomic fibers chiefly influence vascular tone; hormone release is regulated principally by pituitary thyroid-stimulating hormone.',
    recall: 'Review the recurrent laryngeal nerves and posterior parathyroid glands. The isthmus crosses the upper tracheal rings.',
    reference: 'StatPearls · Anatomy, Head and Neck, Thyroid', url: 'https://www.ncbi.nlm.nih.gov/books/NBK470452/',
  },
];

export function getStudyNote(name: string): StudyNote | undefined {
  return STUDY_NOTES.find(note => note.names.includes(name.toLowerCase().trim()));
}
