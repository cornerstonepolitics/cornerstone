const siteConfig = {
  economics: {
    color: '#c59a32', wheel: '#8a6a14', wheelLabel: '#a98222', wheelActive: '#a98222',
    light: '#6b520f', dark: '#6b520f', wheelInk: '#4a3809', label: 'Economics',
    principles: [
      'The economy exists to use limited resources for human good.',
      'The economy turns work and resources into things people value.',
      'Free markets have been the most efficient way people have found to create value.',
      'Markets work best when competition is open, information is clear, and the full costs and benefits are accounted for.'
    ],
    parents: [['labor','Labor'],['monetary','Monetary'],['fiscal','Fiscal'],['markets','Markets']]
  },
  culture: {
    color: '#d27a52', wheel: '#a0522d', wheelLabel: '#c16c47', wheelActive: '#c16c47',
    light: '#7c3f22', dark: '#7c3f22', wheelInk: '#5c2c15', label: 'Culture',
    principles: [
      'People are not born knowing how to live.',
      'Culture is how one generation forms the next.',
      'Culture teaches by what it honors and what it shames.',
      'A country pulls apart when its differences grow deeper than its shared allegiance.'
    ],
    parents: [['education','Education'],['community','Community'],['justice','Justice'],['identity','Identity']]
  },
  governance: {
    color: '#6f9ac7', wheel: '#1e3a5f', wheelLabel: '#5e91c4', wheelActive: '#5e91c4',
    light: '#16293f', dark: '#16293f', wheelInk: '#0e1c2c', label: 'Governance',
    principles: [
      'Government exists to do for the people what they cannot do well alone.',
      'Power must be divided so no faction can rule the whole.',
      'Power should rise only as far from the people as the problem requires.',
      'Power over public decisions belongs to the people.'
    ],
    parents: [['elections','Elections'],['institutions','Institutions'],['foreign','Foreign Policy'],['ruleoflaw','Rule of Law']]
  }
};
const branchOrder = ['economics', 'culture', 'governance'];
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { siteConfig, branchOrder };
}
