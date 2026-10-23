
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `activity_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `activity_events` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `event_type` varchar(64) NOT NULL,
  `project_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `task_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `entry_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `idx_activity_project` (`project_id`,`created_at`,`id`),
  KEY `idx_activity_entry` (`entry_id`,`created_at`,`id`),
  KEY `idx_activity_task` (`task_id`,`created_at`,`id`),
  CONSTRAINT `fk_activity_entry` FOREIGN KEY (`entry_id`) REFERENCES `entries` (`id`),
  CONSTRAINT `fk_activity_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `fk_activity_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `activity_events` WRITE;
/*!40000 ALTER TABLE `activity_events` DISABLE KEYS */;
INSERT INTO `activity_events` VALUES ('7d52b080-c76f-4d51-aadb-0aaf52b57164','entry.captured','feedbd13-1826-4426-abba-8810134cead5','742afef0-c4a0-40a4-a781-dfa3924e1fde','0e750b86-77e0-493f-bc6b-8b8c654e819e','{\"title\":\"Customer list sync anomaly\"}','2026-10-23 00:17:22.577'),('81074cd9-419c-43c9-85ed-93c060cd6f54','task.paused','feedbd13-1826-4426-abba-8810134cead5','742afef0-c4a0-40a4-a781-dfa3924e1fde','ba1ead1f-0973-4c05-bdf8-517d91adbe94','{\"reason\":\"Awaiting expected behavior\"}','2026-10-22 19:17:22.637'),('b21a6cd4-3c75-4ee8-9219-8dbfcdd8f38f','evidence.created','feedbd13-1826-4426-abba-8810134cead5','742afef0-c4a0-40a4-a781-dfa3924e1fde','0e750b86-77e0-493f-bc6b-8b8c654e819e','{\"title\":\"Loyalty state reconciliation\"}','2026-10-22 14:17:22.951'),('c1e61798-1c09-476b-bfb7-efcd5016d295','task.started','b40d920d-5ca6-4fa6-8e9b-194bee1ce11d','2d7b5dc2-afda-4805-a7b8-c0518ff79fab',NULL,'{\"title\":\"Ship the Work Constellation interface\"}','2026-10-23 05:17:22.487'),('e0ee35c9-bf92-4cd8-aade-d95c597f3b18','task.completed','a51c578c-707a-424f-b684-88e9c75f8c8c','c34efd9a-0a89-48aa-8863-8b7785262730',NULL,'{\"title\":\"Normalize location identifiers\"}','2026-10-22 09:17:23.086');
/*!40000 ALTER TABLE `activity_events` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `attachments` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `entry_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `storage_key` varchar(512) NOT NULL,
  `mime_type` varchar(120) NOT NULL,
  `byte_size` bigint(20) unsigned NOT NULL,
  `sha256` binary(32) NOT NULL,
  `purpose` varchar(24) NOT NULL DEFAULT 'reference',
  `caption` text DEFAULT NULL,
  `media_state` varchar(16) NOT NULL DEFAULT 'ready',
  `ocr_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `trashed_at` datetime(3) DEFAULT NULL,
  `width` int(10) unsigned DEFAULT NULL,
  `height` int(10) unsigned DEFAULT NULL,
  `duration_ms` int(10) unsigned DEFAULT NULL,
  `thumbnail_key` varchar(512) DEFAULT NULL,
  `playback_key` varchar(512) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attachments_storage_key` (`storage_key`),
  KEY `idx_attachments_entry` (`entry_id`,`created_at`,`id`),
  KEY `idx_attachments_trash` (`trashed_at`),
  CONSTRAINT `fk_attachments_entry` FOREIGN KEY (`entry_id`) REFERENCES `entries` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `attachments` WRITE;
/*!40000 ALTER TABLE `attachments` DISABLE KEYS */;
INSERT INTO `attachments` VALUES ('27d23aec-eccc-4253-92be-6247481c31c7','0e750b86-77e0-493f-bc6b-8b8c654e819e','image.png','originals/27d23aec-eccc-4253-92be-6247481c31c7.png','image/png',192969,0x32F1279EFA11E090843BC357CD225C01BB6F784E97CA7F91ECE6C90C7C358E7B,'evidence_before','Before: customer list shows loyalty missing after till sync.','ready',1,'2026-10-23 05:17:18.211',NULL,3072,1590,NULL,'thumbnails/27d23aec-eccc-4253-92be-6247481c31c7.webp',NULL),('41111ff9-7351-41fa-9ca7-a00444fcfc7f','3148f046-4688-4e40-9a3f-3823cdaa7922','image (1).png','originals/41111ff9-7351-41fa-9ca7-a00444fcfc7f.png','image/png',29105,0x47F8A88A72D286BB79FEF0EFA5BA1B4BB1EEC4E0FA6B02115E9B5B2C868DBBC2,'instruction','Client message defining the three loyalty registration scenarios.','ready',1,'2026-10-23 05:17:19.009',NULL,346,299,NULL,'thumbnails/41111ff9-7351-41fa-9ca7-a00444fcfc7f.webp',NULL),('54b3c161-84ba-43e8-824f-7392d5a2f505','ee198605-36b4-42ed-9be6-28f5fe4b23a2','8434.jpg','originals/54b3c161-84ba-43e8-824f-7392d5a2f505.jpg','image/jpeg',62370,0xB0D97A3076BBE6ECDF9E5842CF7FC5C0616B28CBAD5ED390932A2F015ACD3425,'reference','Reference map for a trusted learning curriculum.','ready',1,'2026-10-23 05:17:20.072',NULL,513,590,NULL,'thumbnails/54b3c161-84ba-43e8-824f-7392d5a2f505.webp',NULL);
/*!40000 ALTER TABLE `attachments` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `command_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `command_receipts` (
  `command_key` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `operation` varchar(80) NOT NULL,
  `request_hash` binary(32) NOT NULL,
  `result_status` smallint(5) unsigned NOT NULL,
  `result` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`result`)),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `expires_at` datetime(3) NOT NULL,
  PRIMARY KEY (`command_key`),
  KEY `idx_receipts_expiry` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `command_receipts` WRITE;
/*!40000 ALTER TABLE `command_receipts` DISABLE KEYS */;
/*!40000 ALTER TABLE `command_receipts` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `daily_check_in_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `daily_check_in_items` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `check_in_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `section` varchar(16) NOT NULL,
  `task_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `follow_up_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `project_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `snapshot` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`snapshot`)),
  `sort_order` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_check_in_items` (`check_in_id`,`section`,`sort_order`),
  KEY `fk_check_item_task` (`task_id`),
  KEY `fk_check_item_project` (`project_id`),
  KEY `fk_check_item_follow_up` (`follow_up_id`),
  CONSTRAINT `fk_check_item_check_in` FOREIGN KEY (`check_in_id`) REFERENCES `daily_check_ins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_check_item_follow_up` FOREIGN KEY (`follow_up_id`) REFERENCES `follow_ups` (`id`),
  CONSTRAINT `fk_check_item_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `fk_check_item_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`),
  CONSTRAINT `chk_check_item_one_ref` CHECK ((`task_id` is not null) + (`follow_up_id` is not null) + (`project_id` is not null) = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `daily_check_in_items` WRITE;
/*!40000 ALTER TABLE `daily_check_in_items` DISABLE KEYS */;
INSERT INTO `daily_check_in_items` VALUES ('043a81f5-1178-4096-b58a-e8c96785afb2','6544a3ed-714a-41d6-a8d2-93528a2ee39d','due','3f49e912-ab1b-47ce-912a-633a82888402',NULL,NULL,'{\"title\":\"Write the three-scenario sync regression pack\",\"status\":\"waiting\",\"dueDate\":\"2026-10-26\",\"project\":\"XEPOS Loyalty Sync\"}',2),('49548f10-86b7-4e81-93da-e4e9ace75bd7','6544a3ed-714a-41d6-a8d2-93528a2ee39d','current','2d7b5dc2-afda-4805-a7b8-c0518ff79fab',NULL,NULL,'{\"title\":\"Ship the Work Constellation interface\",\"status\":\"in_progress\",\"project\":\"WoKim Product Evolution\"}',0),('9a15ce7c-9489-4ad1-a371-6252e01ee41a','6544a3ed-714a-41d6-a8d2-93528a2ee39d','waiting',NULL,'c9c830de-1054-4cef-a006-0dc4a30aea74',NULL,'{\"question\":\"For scenario one, should the system backfill loyalty automatically or prompt staff to re-register?\",\"person\":\"Marcus Reed\",\"project\":\"XEPOS Loyalty Sync\"}',3),('e3537dd6-5517-4513-a32f-594b6992052d','6544a3ed-714a-41d6-a8d2-93528a2ee39d','paused','742afef0-c4a0-40a4-a781-dfa3924e1fde',NULL,NULL,'{\"title\":\"Fix loyalty registration state mismatch\",\"status\":\"paused\",\"project\":\"XEPOS Loyalty Sync\"}',1);
/*!40000 ALTER TABLE `daily_check_in_items` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `daily_check_ins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `daily_check_ins` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `local_date` date NOT NULL,
  `timezone` varchar(64) NOT NULL,
  `intended_outcome` text DEFAULT NULL,
  `interruption_notes` text DEFAULT NULL,
  `deadline_notes` text DEFAULT NULL,
  `waiting_notes` text DEFAULT NULL,
  `reflection` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `version` int(10) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_check_in_date` (`local_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `daily_check_ins` WRITE;
/*!40000 ALTER TABLE `daily_check_ins` DISABLE KEYS */;
INSERT INTO `daily_check_ins` VALUES ('6544a3ed-714a-41d6-a8d2-93528a2ee39d','2026-10-23','Asia/Karachi','Finish the visual redesign and prove it against a realistic working day.','Pause only with a checkpoint that explains the exact resume point.','Loyalty state mismatch needs a decision tomorrow.','Marcus owes the expected behavior for scenario one.','The app feels useful when the context—not just the record—is visually obvious.','2026-10-23 05:17:21.469','2026-10-23 05:17:21.469',1);
/*!40000 ALTER TABLE `daily_check_ins` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `deletion_manifest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `deletion_manifest` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `object_kind` varchar(24) NOT NULL,
  `object_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `purged_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_deletion_object` (`object_kind`,`object_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `deletion_manifest` WRITE;
/*!40000 ALTER TABLE `deletion_manifest` DISABLE KEYS */;
/*!40000 ALTER TABLE `deletion_manifest` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `derived_texts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `derived_texts` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `attachment_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `kind` varchar(16) NOT NULL,
  `revision_no` int(10) unsigned NOT NULL,
  `machine_text` longtext NOT NULL,
  `reviewed_text` longtext DEFAULT NULL,
  `search_text` longtext NOT NULL,
  `language` varchar(32) DEFAULT NULL,
  `model_id` varchar(191) DEFAULT NULL,
  `segments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`segments`)),
  `is_current` tinyint(1) NOT NULL DEFAULT 1,
  `current_slot` varchar(16) GENERATED ALWAYS AS (if(`is_current`,`kind`,NULL)) STORED,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `version` int(10) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_derived_revision` (`attachment_id`,`kind`,`revision_no`),
  UNIQUE KEY `uq_derived_current` (`attachment_id`,`current_slot`),
  KEY `idx_derived_current` (`attachment_id`,`kind`,`is_current`),
  FULLTEXT KEY `ft_derived_search` (`search_text`),
  CONSTRAINT `fk_derived_attachment` FOREIGN KEY (`attachment_id`) REFERENCES `attachments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `derived_texts` WRITE;
/*!40000 ALTER TABLE `derived_texts` DISABLE KEYS */;
INSERT INTO `derived_texts` VALUES ('55352a05-1603-49ad-862a-a1d8a017b5a7','41111ff9-7351-41fa-9ca7-a00444fcfc7f','ocr',1,'Cover these scenarios: 1 customer is registered at the till but loyalty has not synced; 2 customer exists at till, then loyalty is registered and synced; 3 loyalty is registered first, then the customer enters at till—the opposite of case 1.','Cover these scenarios: 1 customer is registered at the till but loyalty has not synced; 2 customer exists at till, then loyalty is registered and synced; 3 loyalty is registered first, then the customer enters at till—the opposite of case 1.','Cover these scenarios: 1 customer is registered at the till but loyalty has not synced; 2 customer exists at till, then loyalty is registered and synced; 3 loyalty is registered first, then the customer enters at till—the opposite of case 1.','eng','showcase-reviewed-fixture','[]',1,'ocr','2026-10-23 05:17:19.265',1),('666c6f3c-045a-4869-8b6f-a8884c1b53ba','54b3c161-84ba-43e8-824f-7392d5a2f505','ocr',1,'Top 100 YouTube channels grouped by science, technology, engineering, programming, design, mathematics, and personal development.','Top 100 YouTube channels grouped by science, technology, engineering, programming, design, mathematics, and personal development.','Top 100 YouTube channels grouped by science, technology, engineering, programming, design, mathematics, and personal development.','eng','showcase-reviewed-fixture','[]',1,'ocr','2026-10-23 05:17:20.174',1),('674c48ab-139a-499a-909a-a110bd01c290','27d23aec-eccc-4253-92be-6247481c31c7','ocr',1,'CUSTOMERS CUSTOMER LIST. SYNC. CUSTOMER ID 10. LOYALTY values are blank for multiple customers including ASSTA, Bridge, Defibshop, E.L.A., EMR, Entec, GAR007, Innovations, Jasper\'s, and KwikFlow.','CUSTOMERS CUSTOMER LIST. SYNC. CUSTOMER ID 10. LOYALTY values are blank for multiple customers including ASSTA, Bridge, Defibshop, E.L.A., EMR, Entec, GAR007, Innovations, Jasper\'s, and KwikFlow.','CUSTOMERS CUSTOMER LIST. SYNC. CUSTOMER ID 10. LOYALTY values are blank for multiple customers including ASSTA, Bridge, Defibshop, E.L.A., EMR, Entec, GAR007, Innovations, Jasper\'s, and KwikFlow.','eng','showcase-reviewed-fixture','[]',1,'ocr','2026-10-23 05:17:18.857',1);
/*!40000 ALTER TABLE `derived_texts` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `entries` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `project_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `task_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `title` varchar(240) DEFAULT NULL,
  `entry_type` varchar(24) NOT NULL DEFAULT 'note',
  `inbox_state` varchar(16) NOT NULL DEFAULT 'unprocessed',
  `source_kind` varchar(24) NOT NULL,
  `original_text` mediumtext DEFAULT NULL,
  `content_text` mediumtext DEFAULT NULL,
  `source_url` varchar(2048) DEFAULT NULL,
  `source_label` varchar(240) DEFAULT NULL,
  `sender_person_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `occurred_at` datetime(3) DEFAULT NULL,
  `occurred_timezone` varchar(64) DEFAULT NULL,
  `trashed_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `version` int(10) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_entries_inbox` (`inbox_state`,`created_at`,`id`),
  KEY `idx_entries_project` (`project_id`,`occurred_at`,`created_at`,`id`),
  KEY `idx_entries_sender` (`sender_person_id`,`created_at`),
  KEY `idx_entries_trash` (`trashed_at`),
  KEY `idx_entries_task` (`task_id`,`created_at`,`id`),
  FULLTEXT KEY `ft_entries_text` (`title`,`content_text`,`original_text`),
  CONSTRAINT `fk_entries_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `fk_entries_sender` FOREIGN KEY (`sender_person_id`) REFERENCES `people` (`id`),
  CONSTRAINT `fk_entries_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`),
  CONSTRAINT `chk_entry_type` CHECK (`entry_type` in ('note','instruction','decision','question','work_update','checkpoint','reference')),
  CONSTRAINT `chk_inbox_state` CHECK (`inbox_state` in ('unprocessed','organized','dismissed')),
  CONSTRAINT `chk_source_kind` CHECK (`source_kind` in ('typed','pasted','upload','recording'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `entries` WRITE;
/*!40000 ALTER TABLE `entries` DISABLE KEYS */;
INSERT INTO `entries` VALUES ('0344118c-41ed-4965-a0e0-f0cc200cd9a7',NULL,NULL,'Idea: weekly evidence digest','note','unprocessed','typed',NULL,'What if Friday review automatically grouped before/after evidence, resolved questions, and decisions made this week?',NULL,NULL,NULL,'2026-10-23 05:17:14.560','Asia/Karachi',NULL,'2026-10-23 05:17:15.197','2026-10-23 05:17:15.197',1),('0e750b86-77e0-493f-bc6b-8b8c654e819e','feedbd13-1826-4426-abba-8810134cead5','742afef0-c4a0-40a4-a781-dfa3924e1fde','Customer list sync anomaly','work_update','organized','upload',NULL,'The customer list shows repeated till customer ID 10 while loyalty remains blank. Preserve this screenshot as before-state evidence.',NULL,NULL,'b8029a1d-8074-446e-b414-1ebf05da5a16','2026-10-22 05:17:14.560','Europe/London',NULL,'2026-10-23 05:17:14.618','2026-10-23 05:17:14.618',1),('3148f046-4688-4e40-9a3f-3823cdaa7922','feedbd13-1826-4426-abba-8810134cead5','3f49e912-ab1b-47ce-912a-633a82888402','Loyalty sync scenarios from client','instruction','organized','upload',NULL,'Cover three registration orderings: till-first without sync, till-first then loyalty sync, and loyalty-first followed by till entry.',NULL,NULL,'b8029a1d-8074-446e-b414-1ebf05da5a16','2026-10-22 19:17:14.560','Europe/London',NULL,'2026-10-23 05:17:14.677','2026-10-23 05:17:14.677',1),('93bb4297-9ff7-41c8-bc44-b284f8d495fb','b40d920d-5ca6-4fa6-8e9b-194bee1ce11d','2d7b5dc2-afda-4805-a7b8-c0518ff79fab','Visual direction: Work Constellation','decision','organized','typed',NULL,'Use a deep-indigo spatial workspace. Projects are luminous connected systems; evidence and voice notes are visible artifacts. Keep controls familiar, but make the work feel alive.',NULL,NULL,'fa07a242-40ae-4a6c-826d-9ee688c76507','2026-10-21 05:17:14.560','Asia/Karachi',NULL,'2026-10-23 05:17:14.560','2026-10-23 05:17:14.560',1),('a1dbbb0e-ab83-441e-8057-ed8aaa21084e','a51c578c-707a-424f-b684-88e9c75f8c8c','3cfc9929-b7ab-4e62-9fb0-7ce1a7309514','Dashboard briefing should answer “where do I look?”','question','organized','typed',NULL,'Can the opening view explain what changed, what needs attention, and why—without forcing the owner to scan a table?',NULL,NULL,'fa07a242-40ae-4a6c-826d-9ee688c76507','2026-10-20 05:17:14.560','Asia/Karachi',NULL,'2026-10-23 05:17:15.282','2026-10-23 05:17:15.282',1),('ba1ead1f-0973-4c05-bdf8-517d91adbe94','b40d920d-5ca6-4fa6-8e9b-194bee1ce11d','2d7b5dc2-afda-4805-a7b8-c0518ff79fab','Resume after responsive QA','checkpoint','organized','typed',NULL,'Production build is clean and responsive smoke passes. Resume by reviewing populated project cards, then tune the evidence comparison.',NULL,NULL,NULL,'2026-10-23 04:17:20.918','Asia/Karachi',NULL,'2026-10-23 05:17:20.919','2026-10-23 05:17:20.919',1),('ee198605-36b4-42ed-9be6-28f5fe4b23a2','1ac486fd-10ad-4672-ab3a-eaf8414742e6','2932a4e4-990a-4af1-85fb-5ba6461f3ff6','High-signal learning sources','reference','organized','upload',NULL,'Reference map of science, engineering, programming, design, and personal-development channels.',NULL,NULL,'fa07a242-40ae-4a6c-826d-9ee688c76507','2026-10-19 05:17:14.560','Asia/Karachi',NULL,'2026-10-23 05:17:15.015','2026-10-23 05:17:15.015',1);
/*!40000 ALTER TABLE `entries` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `entry_revisions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `entry_revisions` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `entry_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `revision_no` int(10) unsigned NOT NULL,
  `title` varchar(240) DEFAULT NULL,
  `content_text` mediumtext DEFAULT NULL,
  `change_reason` varchar(240) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_entry_revision` (`entry_id`,`revision_no`),
  CONSTRAINT `fk_entry_revisions_entry` FOREIGN KEY (`entry_id`) REFERENCES `entries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `entry_revisions` WRITE;
/*!40000 ALTER TABLE `entry_revisions` DISABLE KEYS */;
/*!40000 ALTER TABLE `entry_revisions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `entry_supersessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `entry_supersessions` (
  `older_entry_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `newer_entry_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `reason` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`older_entry_id`),
  KEY `idx_supersessions_newer` (`newer_entry_id`),
  CONSTRAINT `fk_supersessions_newer` FOREIGN KEY (`newer_entry_id`) REFERENCES `entries` (`id`),
  CONSTRAINT `fk_supersessions_older` FOREIGN KEY (`older_entry_id`) REFERENCES `entries` (`id`),
  CONSTRAINT `ck_supersessions_distinct` CHECK (`older_entry_id` <> `newer_entry_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `entry_supersessions` WRITE;
/*!40000 ALTER TABLE `entry_supersessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `entry_supersessions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `evidence_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `evidence_items` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `evidence_set_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `attachment_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `side` varchar(16) NOT NULL,
  `caption` text DEFAULT NULL,
  `viewport_label` varchar(120) DEFAULT NULL,
  `captured_at` datetime(3) DEFAULT NULL,
  `sort_order` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_evidence_attachment` (`evidence_set_id`,`attachment_id`),
  KEY `idx_evidence_side` (`evidence_set_id`,`side`,`sort_order`),
  KEY `fk_evidence_item_attachment` (`attachment_id`),
  CONSTRAINT `fk_evidence_item_attachment` FOREIGN KEY (`attachment_id`) REFERENCES `attachments` (`id`),
  CONSTRAINT `fk_evidence_item_set` FOREIGN KEY (`evidence_set_id`) REFERENCES `evidence_sets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `evidence_items` WRITE;
/*!40000 ALTER TABLE `evidence_items` DISABLE KEYS */;
INSERT INTO `evidence_items` VALUES ('547c2811-61d4-440a-84e1-bfb72fbe0ac3','58fb78fe-9d39-426f-aacc-2d670510c6c7','41111ff9-7351-41fa-9ca7-a00444fcfc7f','reference','Expected registration scenarios from the client.','Mobile message','2026-10-22 19:17:20.335',1),('630f4c73-bdd5-4059-96f6-58ca04566880','58fb78fe-9d39-426f-aacc-2d670510c6c7','27d23aec-eccc-4253-92be-6247481c31c7','before','Till records are present while loyalty is blank.','Desktop · customer list','2026-10-22 05:17:20.277',0);
/*!40000 ALTER TABLE `evidence_items` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `evidence_sets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `evidence_sets` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `task_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` varchar(240) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `version` int(10) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_evidence_task` (`task_id`,`created_at`,`id`),
  CONSTRAINT `fk_evidence_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `evidence_sets` WRITE;
/*!40000 ALTER TABLE `evidence_sets` DISABLE KEYS */;
INSERT INTO `evidence_sets` VALUES ('58fb78fe-9d39-426f-aacc-2d670510c6c7','742afef0-c4a0-40a4-a781-dfa3924e1fde','Loyalty state reconciliation','Compare the current broken state with the expected registration behavior from the client brief.','2026-10-23 05:17:20.210','2026-10-23 05:17:20.210',1);
/*!40000 ALTER TABLE `evidence_sets` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `export_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `export_jobs` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `scope` varchar(16) NOT NULL,
  `project_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `status` varchar(16) NOT NULL,
  `storage_key` varchar(512) DEFAULT NULL,
  `error_code` varchar(64) DEFAULT NULL,
  `expires_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `completed_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_exports_expiry` (`status`,`expires_at`),
  KEY `fk_export_project` (`project_id`),
  CONSTRAINT `fk_export_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `export_jobs` WRITE;
/*!40000 ALTER TABLE `export_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `export_jobs` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `focus_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `focus_sessions` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `task_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `started_at` datetime(3) NOT NULL,
  `ended_at` datetime(3) DEFAULT NULL,
  `end_reason` varchar(16) DEFAULT NULL,
  `checkpoint_entry_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `open_slot` tinyint(4) GENERATED ALWAYS AS (case when `ended_at` is null then 1 else NULL end) STORED,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_focus_open` (`open_slot`),
  KEY `idx_focus_task` (`task_id`,`started_at`,`id`),
  KEY `fk_focus_checkpoint` (`checkpoint_entry_id`),
  CONSTRAINT `fk_focus_checkpoint` FOREIGN KEY (`checkpoint_entry_id`) REFERENCES `entries` (`id`),
  CONSTRAINT `fk_focus_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`),
  CONSTRAINT `chk_focus_end` CHECK (`ended_at` is null and `end_reason` is null or `ended_at` >= `started_at` and `end_reason` is not null)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `focus_sessions` WRITE;
/*!40000 ALTER TABLE `focus_sessions` DISABLE KEYS */;
INSERT INTO `focus_sessions` VALUES ('040841b0-690b-4171-9f71-8cc65117607d','2d7b5dc2-afda-4805-a7b8-c0518ff79fab','2026-10-23 01:17:21.146','2026-10-23 04:17:21.146','interrupted','ba1ead1f-0973-4c05-bdf8-517d91adbe94',NULL,'2026-10-23 05:17:21.150'),('adc0e3cd-0377-4bb0-9242-cacb1ed99bb6','2d7b5dc2-afda-4805-a7b8-c0518ff79fab','2026-10-23 04:47:21.244',NULL,NULL,NULL,1,'2026-10-23 05:17:21.244');
/*!40000 ALTER TABLE `focus_sessions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `follow_ups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `follow_ups` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `project_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `task_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `person_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `source_entry_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `question` text NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'waiting',
  `follow_up_on` date DEFAULT NULL,
  `resolution` text DEFAULT NULL,
  `resolved_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `version` int(10) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_follow_status` (`status`,`follow_up_on`,`id`),
  KEY `idx_follow_person` (`person_id`,`status`),
  KEY `idx_follow_project` (`project_id`,`status`),
  KEY `idx_follow_task` (`task_id`,`status`),
  KEY `fk_follow_source` (`source_entry_id`),
  CONSTRAINT `fk_follow_person` FOREIGN KEY (`person_id`) REFERENCES `people` (`id`),
  CONSTRAINT `fk_follow_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `fk_follow_source` FOREIGN KEY (`source_entry_id`) REFERENCES `entries` (`id`),
  CONSTRAINT `fk_follow_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `follow_ups` WRITE;
/*!40000 ALTER TABLE `follow_ups` DISABLE KEYS */;
INSERT INTO `follow_ups` VALUES ('6a82e5f3-c75d-4cd2-89e5-4637a5faf0eb','a51c578c-707a-424f-b684-88e9c75f8c8c','3cfc9929-b7ab-4e62-9fb0-7ce1a7309514','fa07a242-40ae-4a6c-826d-9ee688c76507','a1dbbb0e-ab83-441e-8057-ed8aaa21084e','Which three metrics deserve the highest visual weight on opening?','waiting','2026-10-28',NULL,NULL,'2026-10-23 05:17:20.569','2026-10-23 05:17:20.569',1),('6cd0b7a7-b033-4ae8-b5a8-84b4481785e9','b40d920d-5ca6-4fa6-8e9b-194bee1ce11d','2d7b5dc2-afda-4805-a7b8-c0518ff79fab','3cc1a5db-826b-47fb-a345-5a88ee37ff04','93bb4297-9ff7-41c8-bc44-b284f8d495fb','Did the mobile capture dialog retain keyboard focus after closing?','answered','2026-10-22','Yes—verified at desktop, phone, and landscape widths.','2026-10-22 05:17:20.452','2026-10-23 05:17:20.743','2026-10-23 05:17:20.743',1),('c9c830de-1054-4cef-a006-0dc4a30aea74','feedbd13-1826-4426-abba-8810134cead5','3f49e912-ab1b-47ce-912a-633a82888402','b8029a1d-8074-446e-b414-1ebf05da5a16','3148f046-4688-4e40-9a3f-3823cdaa7922','For scenario one, should the system backfill loyalty automatically or prompt staff to re-register?','waiting','2026-10-24',NULL,NULL,'2026-10-23 05:17:20.453','2026-10-23 05:17:20.453',1);
/*!40000 ALTER TABLE `follow_ups` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `interruptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `interruptions` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `from_focus_session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `to_focus_session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_interruption_from` (`from_focus_session_id`),
  UNIQUE KEY `uq_interruption_to` (`to_focus_session_id`),
  CONSTRAINT `fk_interruption_from` FOREIGN KEY (`from_focus_session_id`) REFERENCES `focus_sessions` (`id`),
  CONSTRAINT `fk_interruption_to` FOREIGN KEY (`to_focus_session_id`) REFERENCES `focus_sessions` (`id`),
  CONSTRAINT `chk_interruption_distinct` CHECK (`from_focus_session_id` <> `to_focus_session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `interruptions` WRITE;
/*!40000 ALTER TABLE `interruptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `interruptions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `timestamp` bigint(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,1792638000000,'InitialOwnerAndSessions1792638000000'),(2,1792669000000,'PhaseTwoCaptureAndOrganization1792669000000'),(3,1792673000000,'AttachmentMediaMetadata1792673000000'),(4,1792681000000,'PhaseThreeTasksAndRequirements1792681000000'),(5,1792690000000,'PhaseFourFocusAndCheckIns1792690000000'),(6,1792700000000,'PhaseFiveFollowUpsAndEvidence1792700000000'),(7,1792710000000,'PhaseSixExportsAndDeletionManifest1792710000000'),(8,1792720000000,'PhaseSevenDerivedText1792720000000');
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `people`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `people` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `display_name` varchar(120) NOT NULL,
  `email` varchar(254) DEFAULT NULL,
  `handle` varchar(120) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `archived_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `version` int(10) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_people_archived` (`archived_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `people` WRITE;
/*!40000 ALTER TABLE `people` DISABLE KEYS */;
INSERT INTO `people` VALUES ('3cc1a5db-826b-47fb-a345-5a88ee37ff04','Zoya Ahmed','zoya.ahmed@example.test','@zoya','QA lead; translates edge cases into reproducible scenarios.',NULL,'2026-10-23 05:17:09.344','2026-10-23 05:17:09.344',1),('42425956-3b21-4637-a44d-17b33fbe17ca','Ibrahim Khan','ibrahim.khan@example.test','@ibrahim','Backend engineer; owns sync and data integrity.',NULL,'2026-10-23 05:17:09.285','2026-10-23 05:17:09.285',1),('7d3a751c-2bc5-496d-bffc-b70e53551e76','Anaya Silva','anaya.silva@example.test','@anaya','Mobile engineer supporting the loyalty experience.',NULL,'2026-10-23 05:17:09.577','2026-10-23 05:17:09.577',1),('b8029a1d-8074-446e-b414-1ebf05da5a16','Marcus Reed','marcus.reed@example.test','@marcus','Client operations lead for the retail rollout.',NULL,'2026-10-23 05:17:09.518','2026-10-23 05:17:09.518',1),('fa07a242-40ae-4a6c-826d-9ee688c76507','Maya Chen','maya.chen@example.test','@maya','Product designer; sharp on workflows and accessibility.',NULL,'2026-10-23 05:17:09.228','2026-10-23 05:17:09.228',1);
/*!40000 ALTER TABLE `people` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `person_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `person_teams` (
  `person_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `team_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `role_label` varchar(120) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`person_id`,`team_id`),
  KEY `idx_person_teams_team` (`team_id`,`person_id`),
  CONSTRAINT `fk_person_teams_person` FOREIGN KEY (`person_id`) REFERENCES `people` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_person_teams_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `person_teams` WRITE;
/*!40000 ALTER TABLE `person_teams` DISABLE KEYS */;
INSERT INTO `person_teams` VALUES ('3cc1a5db-826b-47fb-a345-5a88ee37ff04','30c23c15-d26e-4147-a55a-187025c6115b','QA lead','2026-10-23 05:17:10.527'),('3cc1a5db-826b-47fb-a345-5a88ee37ff04','a0a11cf8-0687-455e-b839-efb3e05495e3','Quality owner','2026-10-23 05:17:10.585'),('42425956-3b21-4637-a44d-17b33fbe17ca','30c23c15-d26e-4147-a55a-187025c6115b','Backend engineer','2026-10-23 05:17:10.352'),('7d3a751c-2bc5-496d-bffc-b70e53551e76','9fc9b974-703c-4bfe-8fc3-95c06b62482a','Mobile engineer','2026-10-23 05:17:10.293'),('7d3a751c-2bc5-496d-bffc-b70e53551e76','a0a11cf8-0687-455e-b839-efb3e05495e3','App owner','2026-10-23 05:17:10.760'),('b8029a1d-8074-446e-b414-1ebf05da5a16','a0a11cf8-0687-455e-b839-efb3e05495e3','Client lead','2026-10-23 05:17:10.644'),('fa07a242-40ae-4a6c-826d-9ee688c76507','9fc9b974-703c-4bfe-8fc3-95c06b62482a','Product designer','2026-10-23 05:17:10.256');
/*!40000 ALTER TABLE `person_teams` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `processing_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `processing_jobs` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `kind` varchar(24) NOT NULL,
  `attachment_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'queued',
  `input` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`input`)),
  `result` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`result`)),
  `attempts` int(10) unsigned NOT NULL DEFAULT 0,
  `max_attempts` int(10) unsigned NOT NULL DEFAULT 3,
  `available_at` datetime(3) NOT NULL,
  `lease_token` char(36) DEFAULT NULL,
  `lease_expires_at` datetime(3) DEFAULT NULL,
  `last_error_code` varchar(64) DEFAULT NULL,
  `last_error_message` varchar(500) DEFAULT NULL,
  `dedupe_key` varchar(191) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `version` int(10) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_jobs_claim` (`status`,`available_at`,`id`),
  KEY `idx_jobs_lease` (`lease_expires_at`),
  KEY `fk_jobs_attachment` (`attachment_id`),
  CONSTRAINT `fk_jobs_attachment` FOREIGN KEY (`attachment_id`) REFERENCES `attachments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `processing_jobs` WRITE;
/*!40000 ALTER TABLE `processing_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `processing_jobs` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `processing_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `processing_settings` (
  `id` tinyint(3) unsigned NOT NULL,
  `transcription_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `ocr_languages` varchar(120) NOT NULL DEFAULT 'eng',
  `transcription_language` varchar(32) DEFAULT NULL,
  `model_id` varchar(191) NOT NULL DEFAULT 'onnx-community/whisper-tiny',
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `version` int(10) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  CONSTRAINT `CONSTRAINT_1` CHECK (`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `processing_settings` WRITE;
/*!40000 ALTER TABLE `processing_settings` DISABLE KEYS */;
INSERT INTO `processing_settings` VALUES (1,0,'eng',NULL,'onnx-community/whisper-tiny','2026-10-23 05:17:04.072',1);
/*!40000 ALTER TABLE `processing_settings` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `project_people`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `project_people` (
  `project_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `person_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `role_label` varchar(120) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`project_id`,`person_id`),
  KEY `idx_project_people_person` (`person_id`,`project_id`),
  CONSTRAINT `fk_project_people_person` FOREIGN KEY (`person_id`) REFERENCES `people` (`id`),
  CONSTRAINT `fk_project_people_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `project_people` WRITE;
/*!40000 ALTER TABLE `project_people` DISABLE KEYS */;
INSERT INTO `project_people` VALUES ('1ac486fd-10ad-4672-ab3a-eaf8414742e6','fa07a242-40ae-4a6c-826d-9ee688c76507','Learning experience','2026-10-23 05:17:12.980'),('a51c578c-707a-424f-b684-88e9c75f8c8c','42425956-3b21-4637-a44d-17b33fbe17ca','Data services','2026-10-23 05:17:12.646'),('a51c578c-707a-424f-b684-88e9c75f8c8c','b8029a1d-8074-446e-b414-1ebf05da5a16','Stakeholder','2026-10-23 05:17:12.806'),('a51c578c-707a-424f-b684-88e9c75f8c8c','fa07a242-40ae-4a6c-826d-9ee688c76507','Experience design','2026-10-23 05:17:12.510'),('b40d920d-5ca6-4fa6-8e9b-194bee1ce11d','3cc1a5db-826b-47fb-a345-5a88ee37ff04','Quality','2026-10-23 05:17:11.777'),('b40d920d-5ca6-4fa6-8e9b-194bee1ce11d','42425956-3b21-4637-a44d-17b33fbe17ca','Architecture','2026-10-23 05:17:11.719'),('b40d920d-5ca6-4fa6-8e9b-194bee1ce11d','7d3a751c-2bc5-496d-bffc-b70e53551e76','Mobile review','2026-10-23 05:17:11.845'),('b40d920d-5ca6-4fa6-8e9b-194bee1ce11d','fa07a242-40ae-4a6c-826d-9ee688c76507','Product design','2026-10-23 05:17:11.660'),('feedbd13-1826-4426-abba-8810134cead5','3cc1a5db-826b-47fb-a345-5a88ee37ff04','QA lead','2026-10-23 05:17:12.043'),('feedbd13-1826-4426-abba-8810134cead5','42425956-3b21-4637-a44d-17b33fbe17ca','Sync API','2026-10-23 05:17:11.902'),('feedbd13-1826-4426-abba-8810134cead5','7d3a751c-2bc5-496d-bffc-b70e53551e76','Mobile integration','2026-10-23 05:17:12.307'),('feedbd13-1826-4426-abba-8810134cead5','b8029a1d-8074-446e-b414-1ebf05da5a16','Client owner','2026-10-23 05:17:12.090');
/*!40000 ALTER TABLE `project_people` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `project_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `project_teams` (
  `project_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `team_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`project_id`,`team_id`),
  KEY `idx_project_teams_team` (`team_id`,`project_id`),
  CONSTRAINT `fk_project_teams_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_project_teams_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `project_teams` WRITE;
/*!40000 ALTER TABLE `project_teams` DISABLE KEYS */;
INSERT INTO `project_teams` VALUES ('1ac486fd-10ad-4672-ab3a-eaf8414742e6','9fc9b974-703c-4bfe-8fc3-95c06b62482a','2026-10-23 05:17:13.723'),('a51c578c-707a-424f-b684-88e9c75f8c8c','30c23c15-d26e-4147-a55a-187025c6115b','2026-10-23 05:17:13.546'),('a51c578c-707a-424f-b684-88e9c75f8c8c','9fc9b974-703c-4bfe-8fc3-95c06b62482a','2026-10-23 05:17:13.485'),('b40d920d-5ca6-4fa6-8e9b-194bee1ce11d','30c23c15-d26e-4147-a55a-187025c6115b','2026-10-23 05:17:13.162'),('b40d920d-5ca6-4fa6-8e9b-194bee1ce11d','9fc9b974-703c-4bfe-8fc3-95c06b62482a','2026-10-23 05:17:13.065'),('feedbd13-1826-4426-abba-8810134cead5','30c23c15-d26e-4147-a55a-187025c6115b','2026-10-23 05:17:13.236'),('feedbd13-1826-4426-abba-8810134cead5','a0a11cf8-0687-455e-b839-efb3e05495e3','2026-10-23 05:17:13.429');
/*!40000 ALTER TABLE `project_teams` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `projects` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` varchar(180) NOT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'active',
  `target_date` date DEFAULT NULL,
  `repository_url` varchar(2048) DEFAULT NULL,
  `archived_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `version` int(10) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_projects_status` (`status`,`updated_at`,`id`),
  CONSTRAINT `chk_project_status` CHECK (`status` in ('active','completed','archived'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES ('1ac486fd-10ad-4672-ab3a-eaf8414742e6','Learning Atlas','Curated technical learning paths with source quality and progress notes.','active','2026-12-22',NULL,NULL,'2026-10-23 05:17:11.569','2026-10-23 05:17:11.569',1),('5bffa57b-7095-4c88-a40e-11f68a0283c1','ahp','fsdfsfsaf','active','2026-10-16',NULL,NULL,'2026-10-23 06:40:37.489','2026-10-23 06:40:37.489',1),('a51c578c-707a-424f-b684-88e9c75f8c8c','Retail Insights Dashboard','A decision-ready performance view for multi-location operators.','active','2026-11-27','https://example.test/retail-insights',NULL,'2026-10-23 05:17:11.148','2026-10-23 05:17:11.148',1),('b40d920d-5ca6-4fa6-8e9b-194bee1ce11d','WoKim Product Evolution','Turn the private work-memory prototype into a daily workspace people genuinely want to open.','active','2026-11-13','https://example.test/wokim',NULL,'2026-10-23 05:17:10.863','2026-10-23 05:17:10.863',1),('feedbd13-1826-4426-abba-8810134cead5','XEPOS Loyalty Sync','Resolve customer loyalty registration and till synchronization across the retail estate.','active','2026-10-30','https://example.test/xepos-loyalty',NULL,'2026-10-23 05:17:11.040','2026-10-23 05:17:11.040',1);
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sessions` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` tinyint(3) unsigned NOT NULL,
  `token_hash` binary(32) NOT NULL,
  `created_at` datetime(3) NOT NULL,
  `last_seen_at` datetime(3) NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `revoked_at` datetime(3) DEFAULT NULL,
  `device_label` varchar(180) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sessions_token_hash` (`token_hash`),
  KEY `idx_sessions_user` (`user_id`),
  KEY `idx_sessions_expires` (`expires_at`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tasks` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `project_id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` varchar(240) NOT NULL,
  `description` mediumtext DEFAULT NULL,
  `type` varchar(24) NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'ready',
  `priority` varchar(8) NOT NULL DEFAULT 'normal',
  `requested_by_person_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `source_entry_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `next_action` text DEFAULT NULL,
  `branch_name` varchar(240) DEFAULT NULL,
  `links` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`links`)),
  `deadline_kind` varchar(8) DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `due_at` datetime(3) DEFAULT NULL,
  `due_timezone` varchar(64) DEFAULT NULL,
  `completed_at` datetime(3) DEFAULT NULL,
  `trashed_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `version` int(10) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tasks_source_entry` (`source_entry_id`),
  KEY `idx_tasks_project_status` (`project_id`,`status`,`updated_at`,`id`),
  KEY `idx_tasks_due_date` (`status`,`due_date`,`id`),
  KEY `idx_tasks_due_at` (`status`,`due_at`,`id`),
  KEY `idx_tasks_requester` (`requested_by_person_id`,`status`),
  KEY `idx_tasks_trash` (`trashed_at`),
  FULLTEXT KEY `ft_tasks_text` (`title`,`description`,`next_action`),
  CONSTRAINT `fk_tasks_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`),
  CONSTRAINT `fk_tasks_requester` FOREIGN KEY (`requested_by_person_id`) REFERENCES `people` (`id`),
  CONSTRAINT `fk_tasks_source_entry` FOREIGN KEY (`source_entry_id`) REFERENCES `entries` (`id`),
  CONSTRAINT `ck_tasks_deadline` CHECK ((`due_date` is null or `due_at` is null) and (`due_at` is null or `due_timezone` is not null) and (`deadline_kind` is not null or `due_date` is null and `due_at` is null and `due_timezone` is null))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
INSERT INTO `tasks` VALUES ('2932a4e4-990a-4af1-85fb-5ba6461f3ff6','1ac486fd-10ad-4672-ab3a-eaf8414742e6','Build a trusted programming curriculum','Convert the source infographic into a short sequence of high-signal courses.','investigation','ready','low','fa07a242-40ae-4a6c-826d-9ee688c76507','ee198605-36b4-42ed-9be6-28f5fe4b23a2','Review the programming and engineering sources, then select the first five.',NULL,NULL,'target','2026-11-17',NULL,NULL,NULL,NULL,'2026-10-23 05:17:14.502','2026-10-23 05:17:15.493',1),('2d7b5dc2-afda-4805-a7b8-c0518ff79fab','b40d920d-5ca6-4fa6-8e9b-194bee1ce11d','Ship the Work Constellation interface','Apply the new dimensional visual language without losing speed or accessibility.','feature','in_progress','urgent','fa07a242-40ae-4a6c-826d-9ee688c76507',NULL,'Review the populated Today screen and tune any weak empty states.','codex/work-constellation','[{\"kind\":\"design\",\"label\":\"Visual direction\",\"url\":\"https://example.test/design/work-constellation\"}]','hard','2026-10-25',NULL,NULL,NULL,NULL,'2026-10-23 05:17:13.862','2026-10-23 05:17:13.862',1),('3cfc9929-b7ab-4e62-9fb0-7ce1a7309514','a51c578c-707a-424f-b684-88e9c75f8c8c','Prototype owner performance overview','Turn sales, margin, and location health into a calm daily briefing.','feature','ready','normal','b8029a1d-8074-446e-b414-1ebf05da5a16',NULL,'Sketch the first information hierarchy with Maya.',NULL,NULL,'target','2026-11-04',NULL,NULL,NULL,NULL,'2026-10-23 05:17:14.385','2026-10-23 05:17:14.385',1),('3f49e912-ab1b-47ce-912a-633a82888402','feedbd13-1826-4426-abba-8810134cead5','Write the three-scenario sync regression pack','Cover unsynced till customer, late loyalty sync, and loyalty-first registration.','testing','waiting','high','3cc1a5db-826b-47fb-a345-5a88ee37ff04','3148f046-4688-4e40-9a3f-3823cdaa7922','Wait for Marcus to confirm expected behavior for scenario one.',NULL,NULL,'hard','2026-10-26',NULL,NULL,NULL,NULL,'2026-10-23 05:17:14.327','2026-10-23 05:17:15.436',1),('742afef0-c4a0-40a4-a781-dfa3924e1fde','feedbd13-1826-4426-abba-8810134cead5','Fix loyalty registration state mismatch','A customer can exist at till level while cloud loyalty registration remains incomplete.','bug','paused','urgent','b8029a1d-8074-446e-b414-1ebf05da5a16','0e750b86-77e0-493f-bc6b-8b8c654e819e','Confirm whether till-created customers must be backfilled or explicitly re-registered.','fix/loyalty-reconciliation',NULL,'hard','2026-10-24',NULL,NULL,NULL,NULL,'2026-10-23 05:17:14.210','2026-10-23 05:17:15.377',1),('79ad2b26-dc50-47f7-9073-69b790405741','b40d920d-5ca6-4fa6-8e9b-194bee1ce11d','Validate mobile capture ergonomics','Test thumb reach, recording, attachment review, and focus restoration.','testing','ready','high','3cc1a5db-826b-47fb-a345-5a88ee37ff04',NULL,'Run the capture flow on the 390px viewport and record friction.',NULL,NULL,'target','2026-10-27',NULL,NULL,NULL,NULL,'2026-10-23 05:17:14.089','2026-10-23 05:17:14.089',1),('c34efd9a-0a89-48aa-8863-8b7785262730','a51c578c-707a-424f-b684-88e9c75f8c8c','Normalize location identifiers','Remove duplicate location keys before joining reporting feeds.','integration','done','high','42425956-3b21-4637-a44d-17b33fbe17ca',NULL,'Monitor the next nightly import.',NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 05:17:13.861',NULL,'2026-10-23 05:17:14.444','2026-10-23 05:17:14.444',1);
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `teams` (
  `id` char(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` varchar(120) NOT NULL,
  `notes` text DEFAULT NULL,
  `archived_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `version` int(10) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_teams_archived` (`archived_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `teams` WRITE;
/*!40000 ALTER TABLE `teams` DISABLE KEYS */;
INSERT INTO `teams` VALUES ('30c23c15-d26e-4147-a55a-187025c6115b','Platform Crew','APIs, sync, data processing, and quality.',NULL,'2026-10-23 05:17:10.038','2026-10-23 05:17:10.038',1),('9fc9b974-703c-4bfe-8fc3-95c06b62482a','Product Studio','Design, frontend, and product decisions.',NULL,'2026-10-23 05:17:09.802','2026-10-23 05:17:09.802',1),('a0a11cf8-0687-455e-b839-efb3e05495e3','Retail Launch','Client-facing rollout team.',NULL,'2026-10-23 05:17:10.164','2026-10-23 05:17:10.164',1);
/*!40000 ALTER TABLE `teams` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` tinyint(3) unsigned NOT NULL,
  `email` varchar(254) NOT NULL,
  `display_name` varchar(120) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `timezone` varchar(64) NOT NULL DEFAULT 'UTC',
  `active_focus_session_id` char(36) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
  `focus_version` int(10) unsigned NOT NULL DEFAULT 0,
  `password_changed_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `version` int(10) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `fk_user_active_focus` (`active_focus_session_id`),
  CONSTRAINT `fk_user_active_focus` FOREIGN KEY (`active_focus_session_id`) REFERENCES `focus_sessions` (`id`),
  CONSTRAINT `chk_single_owner` CHECK (`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'showcase@wokim.local','Showcase Owner','$argon2id$v=19$m=65536,p=4,t=3$Flqr0m0sHcbkI+1OALARLw$A4Z+u1hy/9yuOJKP5hbgGJ3DuGp5HLNbNT+YjXNyHyQ','Asia/Karachi','adc0e3cd-0377-4bb0-9242-cacb1ed99bb6',1,'2026-10-23 06:46:51.125','2026-10-22 08:35:11.525','2026-10-23 06:46:51.125',1);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
