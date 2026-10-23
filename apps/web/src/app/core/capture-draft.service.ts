import { Injectable } from '@angular/core';

export interface CaptureDraft { title:string;contentText:string;entryType:string;projectId:string;taskId:string;senderPersonId:string;occurredAt:string;attachmentPurpose:string;transcribeAudio:boolean;updatedAt:number; }

@Injectable({providedIn:'root'})
export class CaptureDraftService {
  private open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open('wokim-drafts',1);request.onupgradeneeded=()=>request.result.createObjectStore('drafts');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
  async load(ownerId:number):Promise<CaptureDraft|null>{const db=await this.open();return new Promise((resolve,reject)=>{const transaction=db.transaction('drafts');const request=transaction.objectStore('drafts').get(`capture:${ownerId}`);request.onsuccess=()=>resolve(request.result??null);request.onerror=()=>reject(request.error);transaction.oncomplete=()=>db.close();});}
  async save(ownerId:number,draft:CaptureDraft):Promise<void>{const db=await this.open();return new Promise((resolve,reject)=>{const transaction=db.transaction('drafts','readwrite');transaction.objectStore('drafts').put(draft,`capture:${ownerId}`);transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=()=>reject(transaction.error);});}
  async clear(ownerId:number):Promise<void>{const db=await this.open();return new Promise((resolve,reject)=>{const transaction=db.transaction('drafts','readwrite');transaction.objectStore('drafts').delete(`capture:${ownerId}`);transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=()=>reject(transaction.error);});}
}
