/**
 * Мок-відповіді AI-Тренера для кожного preset.
 * Використовуються коли `GEMINI_API_KEY` відсутній або Gemini повернув помилку,
 * щоб користувач все одно побачив корисний контент.
 */

export function getCoachMock(presetId: string | null | undefined, vars: Record<string, string>): string {
  const get = (key: string, fallback = "Гравець") => vars[key] || fallback;

  switch (presetId) {
    case "upgrade_priority":
      return `### 🥇 1 місце — Top пробивний DPS
Качай у першу чергу того бійця з твого ТОП-5 за кубками, у якого power < 11. Він уже довів стабільність, тому інвестиція безпечна.

### 🥈 2 місце — Універсальний support
Healers/контрол (Byron, Berry, Pam) дають value у будь-якому 3v3 — підіймуть і твою команду, і випадкових тіммейтів.

### 🥉 3 місце — Тeam scaler
Тeамплеєр для Brawl Ball/Hot Zone (Frank, Edgar, Bibi) витягне рандомів і добре конвертує перемоги у кубки.

*Демо-мок: додай GEMINI_API_KEY для індивідуальних порад на основі реальної колекції ${get("name")}.*`;

    case "hypercharge_choice":
      return `### ⚡ Рекомендація: SPIKE
Hypercharge перетворює його ult на стільниковий АОЕ із сильним slow — це best value у нинішній меті.

### Чому саме він
- Бере gym maps (Knockout, Bounty) сам;
- Швидко чарджиться через шипи на attack;
- Стабільний у будь-якому tier лобі.

### Альтернативи
1. **Stu** — божевільний escape + AOE.
2. **Bibi** — тащить Brawl Ball і Hot Zone.

*Демо-мок: підключи GEMINI_API_KEY для аналізу твоїх p11.*`;

    case "best_mode":
      return `### 🎯 Твій режим: **3v3**
Твоє співвідношення перемог 3v3 проти Solo/Duo показує, що ти краще читаєш карту в команді. Грай Brawl Ball і Heist — там низький варіанс і високий бутік кубків.

Дрейф 50/50: спробуй Hot Zone на 30-хв сесії — якщо winrate > 55% — це твій новий "trophy mine".

*Демо-мок: для точного аналізу налаштуй GEMINI_API_KEY.*`;

    case "showdown_lineup":
      return `### 🎯 Топ-5 Solo Showdown
1. **Stu** — мобільність + reset через ult.
2. **Edgar** — heal + jump out.
3. **Leon** — invisibility закриває fight.
4. **Mortis** — bush control king.
5. **Crow** — poison стейк vs healers.

Закачуй gears: Speed Gear на Stu/Edgar, Damage на Leon/Crow.

*Демо-мок — додай GEMINI_API_KEY для аналізу твоєї колекції.*`;

    case "team_3v3":
      return `### Comp #1 (Brawl Ball)
**Frank (tank)** + **Spike (damage)** + **Pam (support)** — Frank пробиває, Spike контролить, Pam хілить + ставить турель.

### Comp #2 (Knockout)
**Bull (tank)** + **Piper (sniper)** + **Bea (control)** — Bull зачищає, Piper фінішить, Bea робить slow.

### Comp #3 (Hot Zone)
**Rosa (tank)** + **Byron (heal+damage)** + **Tara (AOE ult)** — повна синергія через bushes.

*Демо-мок: GEMINI_API_KEY → аналіз твоїх реальних бійців.*`;

    case "tilt_recovery":
      return `### 🧠 5 порад, як зупинити tilt
1. **Stop loss** — 2 поразки поспіль → перерва 15 хв. Не "ще одна".
2. **Switch mode** — піди на дружній mode (Friend battle, Showdown training).
3. **Audit** — переглянь replay останнього матчу: твоя помилка чи рандом? Якщо рандом — кубки не залежать від тебе.
4. **Гідратація + повітря** — 2 хв окно відкрити, склянку води. Це fix.
5. **Поверни fun** — 1 матч на бравлері з power 1 у Friendly. Мозок зреcетиться.

*Демо-мок — GEMINI_API_KEY для персональних рекомендацій ${get("name")}.*`;

    case "trophy_pushing":
      return `### 🚀 Стратегія pushing
- **Час**: 19:00–22:00 за Києвом — найкраща якість тіммейтів.
- **Режим**: Brawl Ball / Knockout — менший варіанс.
- **Бійці**: бери того, кого вже знаєш на 100%, не нового.
- **Сесії**: 45 хв з паузою 10. Більше — winrate просідає.
- **Stop loss**: ${get("trophies")} → ${Math.round((Number(get("trophies", "10000")) || 10000) * 1.05)} ціль на тиждень. Більше — спайке + ризик rollback.

*Демо-мок — підключи GEMINI_API_KEY для точного плану.*`;

    case "current_meta":
      return `### 🔥 Топ-5 S-tier
**Mortis · Bibi · Stu · Spike · Pam** — закривають 3v3 (Brawl Ball / Hot Zone) і працюють у Showdown.

### 🌱 Топ-3 для початківців
**Shelly · El Primo · Bull** — прощають помилки, висока награда.

### 📉 Найслабші зараз
**8-Bit · Tick · Bo** — overshadowed mobility і damage builds.

*Демо-мок: GEMINI_API_KEY → жива мета на ${get("date")}.*`;

    case "season_strategy":
      return `### 📅 План на 2 тижні
- **Час**: 60–90 хв/день, найкраще ввечері.
- **Режим**: 70% 3v3 (Brawl Ball / Knockout), 30% Duo Showdown з пушинговим бравлером.
- **Ціль**: +${Math.round((Number(get("trophies", "10000")) || 10000) * 0.08).toLocaleString()} кубків за 2 тижні (реалістично, без надриву).
- **Reset day**: 1 раз на тиждень — Friendly або інша гра, щоб не вигоріти.

*Демо-мок — постав GEMINI_API_KEY для індивідуального розкладу.*`;

    case "brawler_deep_dive":
      return `### 💪 Сильні сторони
**${get("brawlerName", "Цей боєць")}** має чудовий burst і добре працює у близьких сутичках.

### ⚠️ Слабкі сторони
Слабкий проти sniper-ів на відкритих картах і потребує підтримки на defense.

### ⭐ Кращий Star Power
**Power #1** — постійний value, дає тилт у дуелях.

### 🎒 Кращий Gadget
**Gadget #1** — закриває або вбиває escape опонента.

### ⚔️ Топ матчапи
- ✅ Tanks → виграш.
- ❌ Sniper → програш.

### 🎮 Як грати
- **Attack**: тримай bushes, чекай ult, тоді dive.
- **Defense**: відсувайся на мід, не давай контроль ракурсу.

*Демо-мок — додай GEMINI_API_KEY для повного гайду.*`;

    default:
      return `### 🤖 Поради від AI-Тренера (Демо-режим)
Це універсальна порада для гравця **${get("name")}**: грай те, що тобі подобається, прокачуй того, хто стабільно дає кубки, і не сиди на одній меті більше ніж 2 тижні.

*⚙️ Демо-мок: додай GEMINI_API_KEY у Secrets для індивідуального AI-аналізу.*`;
  }
}
