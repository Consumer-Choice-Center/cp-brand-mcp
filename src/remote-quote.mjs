import {z} from 'zod';
import {socialSchema} from './social.mjs';
import {portraitBytes} from './portrait-source.mjs';
import {createQuoteService,runQuoteWorker} from './http-artifacts.mjs';
export const remoteQuoteSchema=socialSchema.pick({language:true,mode:true,quote:true,personName:true,personTitle:true,quoteVerified:true,imageAlt:true,imageProvenance:true,imageSourceUrl:true,imageCredit:true,imageLicense:true,visualRelevanceConfirmed:true,portrait:true,focalPoint:true,backgroundGrain:true,factsVerified:true,sources:true,approvedWords:true}).extend({
  template:z.enum(['quote_side','quote_overlay']).default('quote_side'),
  quote:z.string().trim().min(1).max(260),personName:z.string().trim().min(1).max(65),personTitle:z.string().trim().min(1).max(80),
  imageAlt:z.string().trim().min(1).max(300),imageProvenance:z.enum(['provided_photo','sourced_photo']).default('provided_photo'),
  portraitUrl:z.string().url().max(2000).optional().describe('Direct public HTTPS URL to a supplied PNG/JPEG portrait, at most 4 MiB. No login pages or local URLs.'),
  portraitData:z.string().max(5_592_448).optional().describe('Alternative to portraitUrl: PNG/JPEG base64 data URI from the user-supplied image. Do not invent image bytes.')
}).strict();
export const quoteDescription='Render a CP quote post over HTTP and return an inline PNG preview plus expiring PNG, editable SVG, outlined SVG and source JSON download links. Supply the speaker name/title and a real portrait via portraitUrl or portraitData; no server paths. Read brand guidelines first. Use draft for unapproved wording; final requires quoteVerified, factsVerified and sources. Inspect the supplied portrait and set visualRelevanceConfirmed. Save the download links before they expire in one hour.';
export function remoteQuoteService(options={}){
  return createQuoteService({...options,render:async input=>{
    const {portraitUrl,portraitData,...content}=remoteQuoteSchema.parse(input);
    const bytes=await portraitBytes({portraitUrl,portraitData});
    return runQuoteWorker(new URL('./quote-worker.mjs',import.meta.url),{content,portrait:bytes});
  }});
}
