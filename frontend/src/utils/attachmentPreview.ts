import Swal from 'sweetalert2';

export const previewAttachment = (url: string) => {
  const fullUrl = `${import.meta.env.VITE_API_URL}${url}`;
  const isImage = url.match(/\.(jpeg|jpg|gif|png)$/i);
  const isPdf = url.match(/\.pdf$/i);
  const downloadUrl = `${import.meta.env.VITE_API_URL}/download.php?file=${encodeURIComponent(url.replace(/^\//, ''))}`;

  Swal.fire({
    title: 'Attachment Preview',
    html: `
      <div class="mt-4 flex flex-col items-center w-full">
        ${isImage 
          ? `<img src="${fullUrl}" class="max-w-full max-h-[60vh] object-contain rounded-xl shadow-sm border border-slate-200" />` 
          : isPdf 
            ? `<iframe src="${fullUrl}" class="w-full h-[60vh] rounded-xl border border-slate-200"></iframe>`
            : `<div class="p-8 bg-slate-50 border border-slate-200 rounded-2xl w-full text-center">
                 <svg class="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                 <p class="text-sm font-bold text-slate-500">Preview not available for this file type.</p>
               </div>`
        }
        <a href="${downloadUrl}" class="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#7C3AED] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#6D28D9] transition-all shadow-xl shadow-[#7C3AED]/20">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Download File
        </a>
      </div>
    `,
    showConfirmButton: false,
    showCloseButton: true,
    width: isImage || isPdf ? '800px' : '400px',
    customClass: {
      popup: 'rounded-[2.5rem] border border-[#7C3AED]/10 shadow-2xl',
      title: 'font-black text-xl text-[#1E184B]',
      closeButton: 'text-slate-400 hover:text-rose-500 transition-colors'
    }
  });
};
