import React, { useState } from 'react';
import { validateUniversityContentPackage } from './engine';
import { SAMPLE_IMPORTABLE_COURSE_PACKAGE } from './demoData';
import { UniversityContentPackage } from './types';
import { sound } from '../utils/audio';
import {
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  Copy,
  X,
  FileText,
} from 'lucide-react';

interface ContentImporterModalProps {
  onImportSuccess: (pkg: UniversityContentPackage) => void;
  onClose: () => void;
}

export const ContentImporterModal: React.FC<ContentImporterModalProps> = ({
  onImportSuccess,
  onClose,
}) => {
  const [jsonInput, setJsonInput] = useState<string>(
    JSON.stringify(SAMPLE_IMPORTABLE_COURSE_PACKAGE, null, 2)
  );
  const [validationResult, setValidationResult] = useState<ReturnType<
    typeof validateUniversityContentPackage
  > | null>(null);
  const [copied, setCopied] = useState(false);
  const [importedBanner, setImportedBanner] = useState(false);

  const handleValidate = () => {
    sound.playClick();
    const res = validateUniversityContentPackage(jsonInput);
    setValidationResult(res);
  };

  const handleImport = () => {
    sound.playClick();
    const res = validateUniversityContentPackage(jsonInput);
    setValidationResult(res);
    if (res.valid && res.parsedPackage) {
      sound.playCoin();
      onImportSuccess(res.parsedPackage);
      setImportedBanner(true);
      setTimeout(() => setImportedBanner(false), 3000);
    }
  };

  const handleCopyJson = () => {
    sound.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(jsonInput).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      setJsonInput(text);
      setValidationResult(validateUniversityContentPackage(text));
    };
    reader.readAsText(file);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 flex items-center justify-center p-1.5 sm:p-4 bg-[#040e0a]/92 sm:backdrop-blur-sm animate-fadeIn"
      style={{ zIndex: 9999, isolation: 'isolate' }}
    >
      <div className="relative w-full max-w-3xl bg-gradient-to-b from-[#0f241d] via-[#0a1a15] to-[#06110d] border-2 border-[#f59e0b]/90 rounded-[28px] shadow-[0_18px_50px_rgba(0,0,0,0.9),0_4px_0_#451a03,inset_0_1px_0_rgba(254,240,138,0.3)] text-slate-50 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-3.5 py-3 sm:px-6 sm:py-4 bg-gradient-to-b from-[#132e24] via-[#0d211a] to-[#081712] border-b-2 border-amber-300/35 shadow-[0_4px_12px_rgba(0,0,0,0.45)] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] p-0.5 shadow-[0_3px_0_#451a03] shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#071611] flex items-center justify-center text-amber-300">
                <FileCode2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-black text-amber-200 truncate">
                درگاه بارگذاری و اعتبارسنجی منابع درسی (JSON Schema v1.0.0)
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-200 truncate">
                زیرساخت آماده دریافت محتوای استخراج‌شده از PDF و PowerPoint درس «مدیریت نوآوری»
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            aria-label="بستن پنجره بارگذاری"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-b from-rose-600 to-rose-800 hover:from-rose-500 border-2 border-rose-300/70 text-white flex items-center justify-center shadow-[0_3px_0_#4c0519] active:translate-y-0.5 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3.5">
          {/* Architecture Notice */}
          <div className="p-3.5 rounded-2xl bg-[#143026] border-2 border-emerald-600/50 text-xs text-slate-100 leading-relaxed flex items-start gap-2.5">
            <FileText className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-200 block mb-0.5">
                معماری مبتنی بر داده (Content-Driven Architecture):
              </strong>
              هر بسته درسی شامل مشخصات درس (`course`)، سرفصل‌ها (`lessons`)، ارجاع دقیق به شماره صفحه PDF یا اسلاید PowerPoint (`sourceRef`)، وضعیت بازبینی (`draft / reviewed / published`) و محتوای هر ۶ قالب بازی (`contents`) است. محتوای واردشده تا پیش از تایید نهایی با برچسب پیش‌نویس (`draft`) مشخص می‌شود.
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#143026] hover:bg-[#193b2e] border border-emerald-500/50 text-xs font-black text-slate-100 flex items-center gap-1.5 shadow-[0_2px_0_#02100a] cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-amber-300" />
                <span>انتخاب فایل JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => {
                  sound.playClick();
                  setJsonInput(
                    JSON.stringify(SAMPLE_IMPORTABLE_COURSE_PACKAGE, null, 2)
                  );
                  setValidationResult(null);
                }}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#071611] hover:bg-[#143026] border border-emerald-500/50 text-xs font-bold text-slate-100 cursor-pointer"
              >
                بارگذاری نمونه استاندارد
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setJsonInput(
                    JSON.stringify(
                      { schemaVersion: '0.5', course: { id: '' }, contents: [] },
                      null,
                      2
                    )
                  );
                  setValidationResult(null);
                }}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-500/70 text-xs font-bold text-rose-100 cursor-pointer"
              >
                تست JSON نامعتبر (خطایاب)
              </button>
            </div>

            <button
              onClick={handleCopyJson}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#143026] hover:bg-[#193b2e] border border-amber-400/60 text-xs font-black text-amber-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'کپی شد ✓' : 'کپی JSON'}</span>
            </button>
          </div>

          {/* JSON Editor Textarea */}
          <textarea
            dir="ltr"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={10}
            className="w-full font-mono text-xs bg-[#071611] border-2 border-emerald-600/60 rounded-2xl p-3 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-300 leading-relaxed"
          />

          {/* Validation Output */}
          {validationResult && (
            <div
              className={`p-3.5 rounded-2xl border-2 text-xs space-y-2 ${
                validationResult.valid
                  ? 'bg-[#0a1e16] border-emerald-400 text-slate-100'
                  : 'bg-rose-950 border-rose-400 text-rose-100'
              }`}
            >
              {validationResult.valid && validationResult.parsedPackage ? (
                <div>
                  <div className="flex items-center gap-1.5 font-black text-emerald-300 text-sm mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ساختار بسته درسی کاملاً معتبر است! (پیش‌نمایش مدیر)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 bg-[#071611] p-2.5 rounded-xl border border-emerald-600/50">
                    <div>
                      <span className="text-emerald-300 block">عنوان درس:</span>
                      <strong>{validationResult.parsedPackage.course.title}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-300 block">وضعیت منبع:</span>
                      <strong>
                        {validationResult.parsedPackage.course.statusLabelPersian}
                      </strong>
                    </div>
                    <div>
                      <span className="text-emerald-300 block">تعداد قالب‌های بازی:</span>
                      <strong>
                        {validationResult.parsedPackage.contents.length} ماژول بازی
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-1.5 font-black text-rose-300 text-sm mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      خطا در اعتبارسنجی ساختار ({validationResult.issues.length} مورد):
                    </span>
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    {validationResult.issues.map((iss, i) => (
                      <li key={i}>
                        <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-200">
                          {iss.field}
                        </code>
                        : {iss.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {importedBanner && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-[#fde68a] to-[#fbbf24] text-slate-950 font-black text-xs text-center shadow-md">
              بسته درسی با موفقیت در موتور دانشگاه انجلرن ثبت شد! 🎉
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-3.5 py-3 sm:px-6 bg-[#081712] border-t border-emerald-600/45 flex flex-col sm:flex-row gap-2.5 shrink-0">
          <button
            onClick={handleValidate}
            className="flex-1 min-h-[44px] py-2.5 rounded-2xl bg-[#143026] hover:bg-[#193b2e] border-2 border-emerald-400/70 text-slate-100 font-black text-xs shadow-[0_3px_0_#02100a] active:translate-y-0.5 cursor-pointer"
          >
            بررسی و اعتبارسنجی ساختار (Validate Schema)
          </button>
          <button
            onClick={handleImport}
            className="flex-1 min-h-[44px] py-2.5 rounded-2xl bg-gradient-to-b from-[#fde68a] via-[#fbbf24] to-[#f59e0b] hover:from-[#fef08a] text-slate-950 font-black text-xs border-2 border-[#fef08a] shadow-[0_3px_0_#78350f] active:translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>ثبت و درون‌ریزی بسته در دانشگاه</span>
          </button>
        </div>
      </div>
    </div>
  );
};
