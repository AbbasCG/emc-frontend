/** Curated countries for volunteer applications — sorted for UX (Yemen & Netherlands first). */
export type VolunteerCountry = {
  code: string
  name: string
  englishName: string
  dialCode: string
  flag: string
}

export const VOLUNTEER_COUNTRIES: VolunteerCountry[] = [
  { code: 'YE', name: 'اليمن', englishName: 'Yemen', dialCode: '+967', flag: '🇾🇪' },
  { code: 'NL', name: 'هولندا', englishName: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { code: 'MA', name: 'المغرب', englishName: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
  { code: 'TR', name: 'تركيا', englishName: 'Turkey', dialCode: '+90', flag: '🇹🇷' },
  { code: 'EG', name: 'مصر', englishName: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { code: 'SA', name: 'السعودية', englishName: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'الإمارات', englishName: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
  { code: 'JO', name: 'الأردن', englishName: 'Jordan', dialCode: '+962', flag: '🇯🇴' },
  { code: 'IQ', name: 'العراق', englishName: 'Iraq', dialCode: '+964', flag: '🇮🇶' },
  { code: 'PS', name: 'فلسطين', englishName: 'Palestine', dialCode: '+970', flag: '🇵🇸' },
  { code: 'SY', name: 'سوريا', englishName: 'Syria', dialCode: '+963', flag: '🇸🇾' },
  { code: 'LB', name: 'لبنان', englishName: 'Lebanon', dialCode: '+961', flag: '🇱🇧' },
  { code: 'QA', name: 'قطر', englishName: 'Qatar', dialCode: '+974', flag: '🇶🇦' },
  { code: 'KW', name: 'الكويت', englishName: 'Kuwait', dialCode: '+965', flag: '🇰🇼' },
  { code: 'BH', name: 'البحرين', englishName: 'Bahrain', dialCode: '+973', flag: '🇧🇭' },
  { code: 'OM', name: 'عمان', englishName: 'Oman', dialCode: '+968', flag: '🇴🇲' },
]
