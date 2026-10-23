import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProcessingSettings, WorkMemoryService } from '../../core/work-memory.service';
import { PromptDialogService } from '../../core/prompt-dialog.service';
@Component({ imports:[FormsModule], templateUrl: './data-management.component.html', styleUrl: './data-management.component.scss' })
export class DataManagementComponent implements OnInit {
  readonly trash = signal<Record<'entries'|'tasks'|'attachments',Array<Record<string,unknown>>>|null>(null); readonly message=signal('');
  readonly processing=signal<ProcessingSettings|null>(null); transcriptionEnabled=false; ocrLanguages='eng'; transcriptionLanguage='';
  readonly summary=signal<Awaited<ReturnType<WorkMemoryService['dataSummary']>>|null>(null);
  processingOnly=false;
  constructor(readonly memory:WorkMemoryService,private readonly route:ActivatedRoute,private readonly prompts:PromptDialogService){}
  async ngOnInit(){this.processingOnly=this.route.snapshot.routeConfig?.path==='settings/processing';if(!this.processingOnly)await this.reload();const settings=await this.memory.processingSettings();this.processing.set(settings);this.transcriptionEnabled=settings.transcriptionEnabled;this.ocrLanguages=settings.ocrLanguages;this.transcriptionLanguage=settings.transcriptionLanguage||''}
  async reload(){const [trash,summary]=await Promise.all([this.memory.trash(),this.memory.dataSummary()]);this.trash.set(trash);this.summary.set(summary)}
  gib(bytes:number){return (bytes/1024/1024/1024).toFixed(1)}
  diskUsedPercent(status:Awaited<ReturnType<WorkMemoryService['dataSummary']>>){return Math.round((1-status.disk.freeBytes/status.disk.totalBytes)*100)}
  jobCount(status:Awaited<ReturnType<WorkMemoryService['dataSummary']>>,jobStatus:string){return status.processingJobs.filter(job=>job.status===jobStatus).reduce((total,job)=>total+Number(job.count),0)}
  async exportAll(){try{const job=await this.memory.createExport();this.message.set(`Export ready: ${job.id}`);window.location.assign(`/api/v1/exports/${encodeURIComponent(job.id)}/content`)}catch{this.message.set('Export failed.')}}
  async restore(kind:string,item:Record<string,unknown>){const version=Number(item['version']??item['parentVersion']);await this.memory.restore(kind,String(item['id']),version);await this.reload()}
  async purge(kind:string,item:Record<string,unknown>){if(await this.prompts.ask({title:'Permanently delete item?',message:'This cannot be undone. Backup retention may still contain an older copy.',label:'Type PURGE to continue',requiredText:'PURGE',confirmLabel:'Delete permanently',destructive:true})!=='PURGE')return;const version=Number(item['version']??item['parentVersion']);try{await this.memory.purge(kind,String(item['id']),version);this.message.set('Item permanently deleted. Backup retention may still contain an older copy.');await this.reload()}catch{this.message.set('Permanent deletion was blocked by a dependency or stale version.')}}
  async saveProcessing(){const settings=this.processing();if(!settings)return;try{const updated=await this.memory.updateProcessingSettings(settings,{transcriptionEnabled:this.transcriptionEnabled,ocrLanguages:this.ocrLanguages,transcriptionLanguage:this.transcriptionLanguage});this.processing.set({...settings,...updated});this.message.set('Private processing settings saved.')}catch{this.message.set('Processing settings were not saved. Reload and retry.')}}
}
