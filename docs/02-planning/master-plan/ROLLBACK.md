# ↩️ دليل التراجع — Master Plan Rollback

> سطر تراجع واحد لكل مرحلة. **قاعدة:** لا يُستخدم `reset --hard` خارج هذه الوصفات. الفروع `backup/*` لا تُحذف أبداً.
> بعد أي تراجع: حدّث `STATE.md` (علّم المرحلة ⬜ وسجّل سبب التراجع في «قرارات مُتّخذة»).

## نقاط الأساس الثابتة
| المعلَم | SHA/فرع | ماذا يمثّل |
|---------|---------|-----------|
| `e0de247` | dev الأصلي قبل كل عملنا | حالة الفريق في أول سحب |
| `backup/our-premium-work` = `fa1cf85` | كل عملنا (استقرار+UX+هوية V2.2+بريميوم) **قبل** دمج 20 commit للفريق | آخر نقطة قبل الدمج الكبير |
| `origin/dev` = `e624827` | رأس الفريق المدموج في M0 | مرجع كشف force-push |

## التراجع عن المراحل
| المرحلة | أمر التراجع | ملاحظات |
|---------|-------------|---------|
| M0 (الدمج) | `git merge --abort` *(إن كان الدمج ما زال مفتوحاً)* أو `git branch -f dev backup/our-premium-work && git checkout dev` | الثاني يفقد دمج الفريق — أعد M0 من جديد |
| M1 | `git branch -f dev backup/pre-M1 && git checkout dev` | يُنشأ `backup/pre-M1` تلقائياً عند بدء M1 |
| M1.5 | `git branch -f dev backup/pre-M1.5 && git checkout dev` | |
| M2a → M2d | `git branch -f dev backup/pre-M2a` (أو 2b/2c/2d) `&& git checkout dev` | كل مرحلة فرعية لها فرعها |
| M3 → M8 | `git branch -f dev backup/pre-M<n> && git checkout dev` | النمط نفسه |

## تراجع دفعة واحدة (داخل مرحلة)
```bash
git log --oneline -10                 # حدد commit الدفعة (عنوانه M<n>.<batch>: ...)
git revert <sha>                      # تراجع آمن يحفظ التاريخ (المفضَّل)
```

## استرجاع ملف واحد من نقطة أمان
```bash
git checkout backup/pre-M<n> -- path/to/file
```

## النسخ الاحتياطي خارج شجرة العمل (بعد كل مرحلة)
```bash
git bundle create "C:/EMC/backups/emc-frontend-M<n>-$(date +%Y%m%d).bundle" --all
```
الاسترجاع من bundle: `git clone C:/EMC/backups/<file>.bundle restored-repo`
