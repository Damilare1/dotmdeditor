import { useEffect, useRef } from 'react';
import { EyeIcon } from './Icons';

function Preview({ html }) {
  const contentRef = useRef(null);

  // Scroll to top when content changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [html]);

  return (
    <div className="flex-1 flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl min-h-0">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <EyeIcon className="w-5 h-5 text-primary" />
        <span className="text-sm font-medium text-gray-600">Preview</span>
      </div>
      <div
        ref={contentRef}
        className="flex-1 p-4 sm:p-8 overflow-y-auto scrollbar-thin prose-custom"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export default Preview;
