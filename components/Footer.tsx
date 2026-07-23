import React, { useState } from 'react';
import { ReceivedGood, FinishedGood } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import Modal from './Modal';

interface FooterProps {
  receivedGoods: ReceivedGood[];
  finishedGoods: FinishedGood[];
}

const Footer: React.FC<FooterProps> = ({ receivedGoods, finishedGoods }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <footer className="fixed bottom-0 left-0 right-0 bg-transparent py-4 px-8 z-50 flex justify-end items-center pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto">
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 bg-[#205f64] hover:bg-[#498e72] text-white px-5 py-2.5 rounded-full transition-all font-black uppercase tracking-widest text-xs shadow-2xl border-2 border-white/20 active:scale-95 group font-brand"
          >
              <SearchIcon className="w-4 h-4 group-hover:scale-110 transition-transform"/> Master Data Search
          </button>
        </div>
      </footer>

      {/* Iframe Modal for Global Search */}
      <Modal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} title="Master Data Search" size="xl">
          <div className="w-full h-[600px] overflow-hidden rounded-lg border border-[#2ca4c2]/30">
              <iframe 
                  src={`${window.location.pathname}?mode=master_search`} 
                  width="100%" 
                  height="100%" 
                  className="w-full h-full border-none"
                  title="Master Data Search"
              />
          </div>
      </Modal>
    </>
  );
};

export default Footer;