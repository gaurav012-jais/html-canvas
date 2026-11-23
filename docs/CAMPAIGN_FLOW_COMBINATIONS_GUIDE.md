# WAP Campaign Flow & Verification Combinations Guide

Yeh document WAP Manager ke sabhi **Verification Modes**, **Landing Layouts**, **Redirect URLs**, **Vendor CPA Callbacks** aur unke **Real-world Combinations** ka complete reference guide hai.

---

## 1. Overview & Core Architecture

Hamara WAP Flow Engine telecom carrier billing (VAS / DCB), user identity capture (Header Enrichment ya OTP), partner APIs (`checksub`, `blocklist`, `subscribe`), aur vendor (affiliate) CPA postbacks ko orchestrate karta hai.

```
Visitor Click (Ad / Traffic)
       │
       ▼
Landing & Identity Resolution
 (HE Header / Mobile Number / OTP)
       │
       ▼
Partner API Checks (CheckSub / Blocklist)
       │
       ▼
User Funnel (HOME Pack Selection / Confirm / Direct)
       │
       ▼
Billing / Subscribe (Carrier Gateway or Direct Telco API)
       │
       ▼
Outcome (Success Content Portal / Error / Status)
       │
       ▼
Vendor CPA Postback (On Confirm / On OTP / Callback)
```

---

## 2. All Verification Modes Explained

Campaign Settings me `Verification mode` decide karta hai ki user ka MSISDN (mobile number) kaise capture hoga aur user ko bill kaise kiya jayega:

| Mode | Label in UI | Technical ID | Description & Telco Behavior |
| :--- | :--- | :--- | :--- |
| **1. Header Injection** | Header Injection | `HEADER_INJECTION` | Cellular data (3G/4G/5G) par telco gateway HTTP header inject karta hai (Header Enrichment). System background me MSISDN extract kar leta hai. User ko number ya OTP enter nahi karna padta. Agar user Wi-Fi par ho ya header na mile, toh user Error page ya fallback CG URL par jata hai. |
| **2. OTP only** | OTP only | `OTP_ONLY` | Landing par koi HE nahi hota. Chahe user Wi-Fi par ho ya mobile data par, user ka mobile number lekar SMS OTP ke through authentication hota hai. |
| **3. Header Injection + OTP** | Header Injection + OTP | `BOTH` | **Most Popular Hybrid Mode.** Pehle HE check hota hai. Agar cellular data par number mil gaya (**HE Hit**), toh bina OTP ke aage badhta hai. Agar Wi-Fi par ho ya number na mile (**HE Miss**), toh user drop nahi hota — system automatic OTP screen dikhata hai. |
| **4. Universe Telecom DCB** | Universe Telecom DCB | `UNIVERSE_DCB` | Middle East / Israel ke Universe Telecom DCB provider ke liye customized Direct Carrier Billing flow (PIN flow / activation polling). WAP funnel aur API expose dono support karta hai. |
| **5. Orange Burkina Faso** | Orange Burkina Faso | `ORANGE_BF` | French West Africa (+226) ke Orange Burkina Faso VAS network ke liye specific multi-step flow: Pehle `checksub` API se check karta hai. Active ho toh direct portal; new ho toh Auth OTP generate karke USSD/SMS validation complete karta hai. |
| **6. None (null / CG redirect)** | None (null / CG redirect) | `NONE` | Zero-landing flow. Hamare server par koi WAP page render nahi hota. Jaise hi user click karta hai, system use seedha operator ke Consent Gateway (CG) URL par redirect kar deta hai with `click_id`. |
| **7. CG via HOME (no HE)** | CG via HOME (no HE) | `CG_HOME` | Pre-lander flow. User pehle hamari attractive landing page (`HOME`) dekhta hai. Jab user "Subscribe" ya "Watch Video" tap karta hai, tab operator ke Consent Gateway (CG) URL par redirect hota hai. |

---

## 3. Sub-Options & Identity Resolution Settings

### 3.1 Under `HEADER_INJECTION` & `BOTH`: "After HE resolved"
Jab telco header se number mil jaye (ya hybrid mode me resolve ho jaye), toh user ko kahan le jana hai:
* **`HOME page`**: Number resolve hone ke baad bhi user ko HOME page dikhaya jata hai jahan pack details (Daily/Weekly/Monthly) aur Subscribe CTAs hote hain. Compliant flows ke liye best hai.
* **`Skip HOME`**: Number resolve hote hi background me turant subscribe call lagai jati hai aur user direct Thank-You / Content Portal par chala jata hai (1-Click / Zero-Click flow).

---

### 3.2 Under `OTP_ONLY`: "Landing page" & "After OTP verified"

#### A. Landing page (Pehli screen kaunsi aayegi):
* **`OTP first`**: User landing URL par aate hi seedha Mobile Number aur OTP input screen dekhta hai (No intro page).
* **`HOME first`**: User pehle service ka promotional landing page (`HOME`) dekhta hai. Button click karne par OTP screen aati hai.
* **`API expose`**: Koi WAP webpage render nahi hota. External mobile apps ya third-party backends direct hamari `/api/otp/send` aur `/api/otp/verify` public endpoints use karte hain.

#### B. After OTP verified (OTP verify hone ke baad kya hoga):
* **`HOME page`**: OTP verify hone ke baad user HOME page par aata hai jahan packs hote hain aur confirm button dabane par subscribe hota hai.
* **`Skip HOME`**: OTP verify hote hi background me turant subscription complete ho jati hai aur user direct Thank-You ya Portal URL par chala jata hai.

---

### 3.3 Under `UNIVERSE_DCB`: "Delivery"
* **`WAP funnel`**: Full multi-step pages: Number input → Pack selection → PIN entry → Background activation polling → Thank-you.
* **`API expose`**: Vendor ke server-to-server apps ke liye direct PIN request, confirm aur status APIs expose karta hai.

---

## 4. Landing Layout & Flow Engine Settings

### 4.1 Landing Layout
* **`Classic`**: 
  * User pehle normal `HOME` page dekhta hai. Jab user CTA button dabata hai, tab identity check (HE ya OTP) chalu hota hai.
* **`Checks before Home` (`packs_on_home`)**:
  * User ke page dekhne se pehle hi background me identity resolution (HE) aur partner `checksub` (subscriber check) run ho jata hai.
  * Agar user **already active subscriber** hai, toh bina kisi extra step ke direct content portal par bhej diya jata hai.
  * Agar HE fail hota hai, toh seedha fallback URL / Error page bhejta hai bina khali page dikhaye.

---

## 5. Redirect URLs & Exit Timing

### 5.1 CG / home redirect URL
* Operator ke Consent Gateway (CG) ka URL (e.g. `https://operator.com/cg?click_id={{click_id}}`).
* **Use Cases:**
  1. `NONE` mode me landing par direct yahan bhejta hai.
  2. `CG_HOME` mode me HOME button tap hone par yahan bhejta hai.
  3. `HEADER_INJECTION` me agar number na mile aur koi `failRedirectUrl` na ho toh fallback yahan hota hai.
* **Supported Placeholders:** `{{msisdn}}`, `{{click_id}}`, `{rcid}`.

### 5.2 Success / content URL & After success
* **Success / content URL**: User jab successfully subscribe ho jaye ya already active ho, toh game/video content portal ka link (e.g. `https://content.example/portal?msisdn={{msisdn}}`).
* **After success:**
  * **`Show thank-you`**: User ko ~2 seconds ke liye "Thank you! You are subscribed" page dikhata hai, fir portal URL par redirect karta hai.
  * **`Redirect immediately`**: Thank-you screen ka paint skip karta hai aur 0 milliseconds me instant portal URL khol deta hai.

---

## 6. Vendor CPA Callback (Postback Trigger Timing)

Affiliate network ya media buyer ko conversion postback kab queue karke fire karna hai:

* **`On Confirm`**: 
  * Jab user Confirm / Subscribe button click karta hai (Classic ya HOME pack selection flows ke liye).
* **`On OTP verify`**: 
  * Jab user OTP enter karke verify continue karta hai (PIN = subscribe ya Skip HOME flows ke liye).
  * *Important:* Agar aapne `Skip HOME` select kiya hai toh `On OTP verify` select karna zaroori hai, kyunki user Confirm button dabata hi nahi hai.
* **`Both`**: 
  * Dono events par pending queue karta hai. System smart deduplication use karta hai — same MSISDN ki ek hi conversion postback row upsert hoti hai, duplicate fire nahi hota.

---

## 7. All Practical Combinations & User Journeys

Neeche telecom campaigns ke sabhi practical combinations aur unki step-by-step user journey di gayi hai:

---

### Combination 1: Pure 1-Click Mobile Data Flow (Highest CR)
* **Configuration:**
  * **Verification Mode:** `Header Injection`
  * **After HE resolved:** `Skip HOME`
  * **Landing layout:** `Checks before Home`
  * **After success:** `Redirect immediately`
  * **Vendor CPA callback:** `On Confirm` (ya API callback)
* **User Journey:**
  1. User ad link par click karta hai.
  2. System cellular header se user ka number nikaal leta hai.
  3. Background me partner subscribe API call hoti hai.
  4. Instant content portal khulta hai.
* **Best For:** 3G/4G traffic, aggressive media buying jahan 1-click subscription allowed ho.

---

### Combination 2: Standard 2-Click Cellular Flow (Carrier Compliant)
* **Configuration:**
  * **Verification Mode:** `Header Injection`
  * **After HE resolved:** `HOME page`
  * **Landing layout:** `Classic`
  * **After success:** `Show thank-you`
  * **Vendor CPA callback:** `On Confirm`
* **User Journey:**
  1. User landing page dekhta hai (Header Injection background me number resolve kar leta hai).
  2. User "Subscribe Daily Pack" button click karta hai.
  3. Thank-you screen 2 seconds dikhti hai.
  4. Content portal redirect hota hai.
* **Best For:** Regulated markets jahan user se pack selection aur pricing confirmation click lena compulsory hota hai.

---

### Combination 3: Universal Hybrid Flow (Mobile Data + Wi-Fi)
* **Configuration:**
  * **Verification Mode:** `Header Injection + OTP`
  * **After HE resolved:** `HOME page`
  * **Landing layout:** `Checks before Home`
  * **Vendor CPA callback:** `Both`
* **User Journey:**
  * **Cellular Data User:** Number automatically HE se milta hai → HOME page par pack choose karta hai → Subscribe.
  * **Wi-Fi User:** HE miss ho jata hai → Turant OTP screen khulti hai → User number + OTP verify karta hai → HOME page par pack choose karta hai → Subscribe.
* **Best For:** Mixed traffic (Meta Ads, Google Ads, TikTok Ads) jahan user Wi-Fi aur mobile network dono par hote hain.

---

### Combination 4: Aggressive Direct PIN-to-Bill Flow
* **Configuration:**
  * **Verification Mode:** `OTP only`
  * **Landing page:** `OTP first`
  * **After OTP verified:** `Skip HOME`
  * **Landing layout:** `Checks before Home`
  * **After success:** `Redirect immediately`
  * **Vendor CPA callback:** `On OTP verify`
* **User Journey:**
  1. User landing link click karta hai → Seedha **Phone number & OTP screen** khulti hai.
  2. User OTP daal kar submit karta hai.
  3. Instant subscribe hota hai aur direct Game/Video portal khulta hai.
  4. Affiliate postback turant fire ho jata hai.
* **Best For:** Popunder, direct redirects, Wi-Fi traffic jahan zero distraction aur fastest conversion chahiye.

---

### Combination 5: OTP First with Pack Selection
* **Configuration:**
  * **Verification Mode:** `OTP only`
  * **Landing page:** `OTP first`
  * **After OTP verified:** `HOME page`
  * **Landing layout:** `Checks before Home`
  * **After success:** `Show thank-you`
  * **Vendor CPA callback:** `On Confirm`
* **User Journey:**
  1. User number daal kar OTP verify karta hai.
  2. Verify hote hi HOME page khulta hai jahan pricing options hote hain.
  3. User apna pack select karke "Subscribe" click karta hai.
  4. Success screen aati hai aur portal redirect hota hai.
* **Best For:** Aise markets jahan telco verification pehle mangta hai par pack selection mandatory hota hai.

---

### Combination 6: Classic Pre-lander + Full Funnel
* **Configuration:**
  * **Verification Mode:** `OTP only`
  * **Landing page:** `HOME first`
  * **After OTP verified:** `HOME page`
  * **Landing layout:** `Classic`
  * **Vendor CPA callback:** `On Confirm`
  * **After success:** `Show thank-you`
* **User Journey:**
  1. User landing page (teaser/trailer) dekhta hai.
  2. "Get Access" click karta hai → OTP page aati hai.
  3. OTP enter karke verify karta hai → Confirm screen aati hai.
  4. User subscribe confirm karta hai.
* **Best For:** Branded / Content campaigns jahan user engagement aur retention zaroori ho taaki churn rate kam rahe.

---

### Combination 7: High-Impact Pre-lander + Instant Subscribe
* **Configuration:**
  * **Verification Mode:** `OTP only`
  * **Landing page:** `HOME first`
  * **After OTP verified:** `Skip HOME`
  * **Landing layout:** `Classic`
  * **Vendor CPA callback:** `On OTP verify`
  * **After success:** `Redirect immediately`
* **User Journey:**
  1. User attractive pre-lander dekhta hai.
  2. CTA click karta hai → OTP screen khulti hai.
  3. OTP verify hote hi auto-subscribe aur instant portal redirect.
* **Best For:** Advertorials, review-style pre-landers jahan presell ke baad sirf OTP verify karwana hota hai.

---

### Combination 8: Zero-Landing Operator Consent Flow
* **Configuration:**
  * **Verification Mode:** `None (null / CG redirect)`
  * **CG / home redirect URL:** Operator official Consent Gateway URL
  * **Vendor CPA callback:** Telco callback trigger par
* **User Journey:**
  1. User campaign link click karta hai.
  2. Hamara server user ko bina koi page dikhaye telco ke official CG link par bhej deta hai.
  3. User operator ke page par subscribe karta hai.
  4. Operator hamare `/api/flow/callback` par webhook hit karta hai aur vendor postback fire hota hai.
* **Best For:** Tier-1 telcos (e.g. STC, Zain, Ooredoo) jo custom hosted WAP pages allow nahi karte aur official payment pages mandatory karte hain.

---

### Combination 9: Pre-lander + Operator Consent Gateway
* **Configuration:**
  * **Verification Mode:** `CG via HOME (no HE)`
  * **CG / home redirect URL:** Operator official Consent Gateway URL
* **User Journey:**
  1. User hamara customized HOME page dekhta hai.
  2. "Watch Full Video" click karta hai.
  3. User operator ke official billing portal par redirect hota hai with `click_id`.
  4. Billing complete hone par callback se conversion register hoti hai.
* **Best For:** Aise offers jahan carrier gateway direct traffic par low conversion deta hai, isliye pre-lander se intent badhana zaroori hota hai.

---

### Combination 10: Headless External App / API Expose
* **Configuration:**
  * **Verification Mode:** `OTP only` (ya `UNIVERSE_DCB`)
  * **Landing page:** `API expose`
* **User Journey:**
  1. Koi frontend HTML serve nahi hota.
  2. Partner app direct REST API hit karta hai:
     * `POST /api/otp/send`
     * `POST /api/otp/verify`
  3. Hamara system telco se bill karke JSON response return karta hai.
* **Best For:** Android / iOS native apps jo apni custom UI ke andar direct carrier billing integrate karte hain.

---

## 8. Quick Reference Matrix (Cheat Sheet)

| Marketing Goal / Flow Type | Verification Mode | Landing Page | After Identity | Landing Layout | Postback Timing | Exit Timing |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Pure 1-Click (Cellular)** | `HEADER_INJECTION` | *(Default)* | `Skip HOME` | `Checks before Home` | `On Confirm` | `Redirect immediately` |
| **2-Click Carrier Compliant** | `HEADER_INJECTION` | *(Default)* | `HOME page` | `Classic` | `On Confirm` | `Show thank-you` |
| **Universal (Wi-Fi + 4G)** | `BOTH` | *(Default)* | `HOME page` | `Checks before Home` | `Both` | `Show thank-you` |
| **Direct PIN-to-Bill (Fastest)** | `OTP_ONLY` | `OTP first` | `Skip HOME` | `Checks before Home` | `On OTP verify` | `Redirect immediately` |
| **OTP First + Pack Select** | `OTP_ONLY` | `OTP first` | `HOME page` | `Checks before Home` | `On Confirm` | `Show thank-you` |
| **Prelander + Instant Subscribe**| `OTP_ONLY` | `HOME first` | `Skip HOME` | `Classic` | `On OTP verify` | `Redirect immediately` |
| **Classic 2-Step Prelander** | `OTP_ONLY` | `HOME first` | `HOME page` | `Classic` | `On Confirm` | `Show thank-you` |
| **Direct Carrier Consent (CG)** | `NONE` | *(N/A)* | *(N/A)* | *(N/A)* | Callback fire | Carrier Gateway |
| **Prelander to Carrier CG** | `CG_HOME` | `HOME` | *(N/A)* | *(N/A)* | Callback fire | Carrier Gateway |
| **In-App / Headless APIs** | `OTP_ONLY` / `DCB`| `API expose` | *(N/A)* | *(N/A)* | `Both` | JSON API response |

---
*Generated for WAP Manager Operations & Campaign Configurations.*
