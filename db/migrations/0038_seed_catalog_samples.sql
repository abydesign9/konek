-- ============================================================
-- KONEK — Migration 0038: sample catalogue for every product
--
-- Seeds demo catalog_items so each product page has real content while the live
-- vendor adapters are pending. vendor='manual' so the catalog-sync pipeline never
-- overwrites these, and admins can edit/delete them in Rates. Idempotent via the
-- (vendor, service_type, external_id) unique key. Prices are in minor units
-- (kobo for NGN, cents for USD); cost < price so margin reporting isn't zero.
-- Safe to remove/replace once real catalogs sync.
-- ============================================================

INSERT INTO catalog_items (vendor, service_type, external_id, name, network, country, cost_minor, price_minor, currency, meta, active)
VALUES
  -- ---------- Data ----------
  ('manual','data','mtn-500mb','500MB · 30 days','MTN','NG',32000,35000,'NGN','{"dataMb":500,"validityDays":30}',true),
  ('manual','data','mtn-1gb','1GB · 30 days','MTN','NG',55000,60000,'NGN','{"dataMb":1024,"validityDays":30}',true),
  ('manual','data','mtn-2gb','2GB · 30 days','MTN','NG',110000,120000,'NGN','{"dataMb":2048,"validityDays":30}',true),
  ('manual','data','mtn-5gb','5GB · 30 days','MTN','NG',230000,250000,'NGN','{"dataMb":5120,"validityDays":30}',true),
  ('manual','data','mtn-10gb','10GB · 30 days','MTN','NG',420000,450000,'NGN','{"dataMb":10240,"validityDays":30}',true),
  ('manual','data','glo-1gb','1GB · 30 days','GLO','NG',50000,55000,'NGN','{"dataMb":1024,"validityDays":30}',true),
  ('manual','data','glo-2gb','2GB · 30 days','GLO','NG',95000,100000,'NGN','{"dataMb":2048,"validityDays":30}',true),
  ('manual','data','glo-5gb','5GB · 30 days','GLO','NG',215000,230000,'NGN','{"dataMb":5120,"validityDays":30}',true),
  ('manual','data','airtel-1gb','1GB · 30 days','AIRTEL','NG',55000,60000,'NGN','{"dataMb":1024,"validityDays":30}',true),
  ('manual','data','airtel-2gb','2GB · 30 days','AIRTEL','NG',108000,115000,'NGN','{"dataMb":2048,"validityDays":30}',true),
  ('manual','data','9mobile-1gb','1GB · 30 days','9MOBILE','NG',60000,65000,'NGN','{"dataMb":1024,"validityDays":30}',true),
  ('manual','data','9mobile-2gb','2GB · 30 days','9MOBILE','NG',112000,120000,'NGN','{"dataMb":2048,"validityDays":30}',true),

  -- ---------- Cable TV ----------
  ('manual','cable','dstv-padi','DStv Padi','DStv','NG',420000,440000,'NGN',NULL,true),
  ('manual','cable','dstv-yanga','DStv Yanga','DStv','NG',580000,600000,'NGN',NULL,true),
  ('manual','cable','dstv-confam','DStv Confam','DStv','NG',1060000,1100000,'NGN',NULL,true),
  ('manual','cable','dstv-compact','DStv Compact','DStv','NG',1840000,1900000,'NGN',NULL,true),
  ('manual','cable','dstv-compact-plus','DStv Compact Plus','DStv','NG',2900000,3000000,'NGN',NULL,true),
  ('manual','cable','dstv-premium','DStv Premium','DStv','NG',4350000,4450000,'NGN',NULL,true),
  ('manual','cable','gotv-smallie','GOtv Smallie','GOtv','NG',180000,190000,'NGN',NULL,true),
  ('manual','cable','gotv-jinja','GOtv Jinja','GOtv','NG',380000,390000,'NGN',NULL,true),
  ('manual','cable','gotv-jolli','GOtv Jolli','GOtv','NG',560000,580000,'NGN',NULL,true),
  ('manual','cable','gotv-max','GOtv Max','GOtv','NG',830000,850000,'NGN',NULL,true),
  ('manual','cable','startimes-nova','StarTimes Nova','StarTimes','NG',180000,190000,'NGN',NULL,true),
  ('manual','cable','startimes-basic','StarTimes Basic','StarTimes','NG',380000,400000,'NGN',NULL,true),
  ('manual','cable','startimes-smart','StarTimes Smart','StarTimes','NG',490000,510000,'NGN',NULL,true),
  ('manual','cable','startimes-super','StarTimes Super','StarTimes','NG',870000,900000,'NGN',NULL,true),

  -- ---------- Exam pins ----------
  ('manual','exam_pin','waec','WAEC Result Checker','WAEC','NG',420000,450000,'NGN',NULL,true),
  ('manual','exam_pin','neco','NECO Result Token','NECO','NG',120000,130000,'NGN',NULL,true),
  ('manual','exam_pin','jamb','JAMB e-PIN','JAMB','NG',580000,600000,'NGN',NULL,true),
  ('manual','exam_pin','nabteb','NABTEB Scratch Card','NABTEB','NG',330000,350000,'NGN',NULL,true),

  -- ---------- Gift cards (network = brand) ----------
  ('manual','gift_card','amazon-10','Amazon $10','Amazon','US',1140000,1200000,'NGN',NULL,true),
  ('manual','gift_card','amazon-25','Amazon $25','Amazon','US',2850000,3000000,'NGN',NULL,true),
  ('manual','gift_card','amazon-50','Amazon $50','Amazon','US',5700000,6000000,'NGN',NULL,true),
  ('manual','gift_card','steam-10','Steam $10','Steam','US',1180000,1250000,'NGN',NULL,true),
  ('manual','gift_card','steam-20','Steam $20','Steam','US',2360000,2500000,'NGN',NULL,true),
  ('manual','gift_card','itunes-10','iTunes $10','iTunes','US',1140000,1200000,'NGN',NULL,true),
  ('manual','gift_card','itunes-25','iTunes $25','iTunes','US',2850000,3000000,'NGN',NULL,true),
  ('manual','gift_card','googleplay-10','Google Play $10','Google Play','US',1140000,1200000,'NGN',NULL,true),
  ('manual','gift_card','netflix-15','Netflix $15','Netflix','US',1720000,1800000,'NGN',NULL,true),

  -- ---------- eSIM (USD) ----------
  ('manual','esim','esim-us-1gb','United States · 1GB · 7 days','USA','US',380,450,'USD','{"type":"country","dataMb":1024,"validityDays":7,"place":"United States","flag":"🇺🇸"}',true),
  ('manual','esim','esim-ng-2gb','Nigeria · 2GB · 15 days','Nigeria','NG',500,600,'USD','{"type":"country","dataMb":2048,"validityDays":15,"place":"Nigeria","flag":"🇳🇬"}',true),
  ('manual','esim','esim-eu-3gb','Europe · 3GB · 30 days','Europe','EU',680,800,'USD','{"type":"region","dataMb":3072,"validityDays":30,"place":"Europe","flag":"🇪🇺"}',true),
  ('manual','esim','esim-global-5gb','Global · 5GB · 30 days','Global',NULL,1900,2200,'USD','{"type":"global","dataMb":5120,"validityDays":30,"place":"Global","flag":"🌍"}',true),

  -- ---------- Router & MiFi (NGN) ----------
  ('manual','router_mifi','mtn-mifi','MTN 4G MiFi Device','MTN','NG',1850000,1950000,'NGN','{"speed":"4G LTE"}',true),
  ('manual','router_mifi','glo-mifi','Glo MiFi Device','GLO','NG',1700000,1800000,'NGN','{"speed":"4G LTE"}',true),
  ('manual','router_mifi','smile-router','Smile 4G Router','Smile','NG',3000000,3150000,'NGN','{"speed":"4G LTE"}',true),
  ('manual','router_mifi','mtn-router','MTN 4G Router','MTN','NG',3450000,3600000,'NGN','{"speed":"4G LTE"}',true),

  -- ---------- International data (USD, network = country) ----------
  ('manual','intl_data','intl-uk-3gb','United Kingdom · 3GB · 30 days','GB','GB',760,900,'USD','{"dataMb":3072,"validityDays":30,"place":"United Kingdom"}',true),
  ('manual','intl_data','intl-us-5gb','United States · 5GB · 30 days','US','US',1000,1200,'USD','{"dataMb":5120,"validityDays":30,"place":"United States"}',true),
  ('manual','intl_data','intl-gh-2gb','Ghana · 2GB · 15 days','GH','GH',420,500,'USD','{"dataMb":2048,"validityDays":15,"place":"Ghana"}',true)
ON CONFLICT (vendor, service_type, external_id) DO NOTHING;
