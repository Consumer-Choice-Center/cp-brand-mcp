import nspell from 'nspell';
import en from 'dictionary-en';
import gb from 'dictionary-en-gb';
import sv from 'dictionary-sv';
const dictionaries={en:[nspell(en),nspell(gb)],sv:[nspell(sv)]};
const terms=['CP','MCP','Considerate','Pouchers','nicotine','pouches','nikotinpåsar','EU','SVG'];
export function reviewSpelling(fields,{language='en',approvedWords=[]}={}) {
 if(!dictionaries[language])throw Error('Supported languages: en, sv.');
 const allowed=new Set([...terms,...approvedWords].map(s=>s.toLocaleLowerCase(language))),issues=[];
 for(const [field,text] of Object.entries(fields)) {
  const masked=text.replace(/https?:\/\/\S+|www\.\S+/gi,m=>' '.repeat(m.length));
  for(const m of masked.matchAll(/[\p{L}]+(?:['’][\p{L}]+)*/gu)) {
   const word=m[0],lower=word.toLocaleLowerCase(language);
   if(word.length<2||allowed.has(lower)||dictionaries[language].some(d=>d.correct(word)||d.correct(lower)))continue;
   issues.push({field,word,start:m.index,end:m.index+word.length,suggestions:dictionaries[language][0].suggest(word).slice(0,4)});
  }
 }
 return {ok:!issues.length,language,issues,fields,notice:'Suggestions only. No text was changed. Names, quotations and factual claims require caller review.'};
}
