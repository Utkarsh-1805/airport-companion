import React, { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, HelpCircle, Search } from "lucide-react";
import { useRouter } from "../router/RouterContext.jsx";
import { FAQ_CATEGORIES, FAQ_ITEMS } from "../data/faq.js";

export default function FaqPage() {
  const { navigate } = useRouter();
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);

  const results = useMemo(() => {
    const term = search.toLowerCase().trim();
    return FAQ_ITEMS.filter((item) => {
      if (activeCat !== "all" && item.category !== activeCat) return false;
      if (!term) return true;
      const haystack = [
        item.question,
        item.answer,
        ...(item.bullets || []),
      ].join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [activeCat, search]);

  return (
    <section className="explore page-enter faq-page">
      <button className="back-link" onClick={() => navigate("/home")}>
        <ArrowLeft size={20} /> Back to concierge
      </button>
      <div className="faq-head">
        <h1><HelpCircle size={28} /> Airport FAQ</h1>
        <p>
          Quick answers on what you can carry, baggage limits, security, documents, and facilities — sourced from BCAS, DGCA, and Indian carriers.
        </p>
      </div>

      <div className="search-row">
        <div className="search-box">
          <Search size={22} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search FAQs (e.g. liquids, power bank, weight)..."
          />
        </div>
      </div>

      <div className="faq-tabs">
        <button
          className={activeCat === "all" ? "active" : ""}
          onClick={() => setActiveCat("all")}
        >
          All
        </button>
        {FAQ_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={activeCat === cat.id ? "active" : ""}
            onClick={() => setActiveCat(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="faq-list">
        {results.length === 0 && (
          <p className="faq-empty">No FAQs match your search. Try a different keyword.</p>
        )}
        {results.map((item) => {
          const isOpen = openId === item.id;
          return (
            <article
              key={item.id}
              className={`faq-item ${isOpen ? "open" : ""}`}
            >
              <button
                type="button"
                className="faq-question"
                onClick={() => setOpenId(isOpen ? null : item.id)}
                aria-expanded={isOpen}
              >
                <span>{item.question}</span>
                <ChevronDown size={20} className="faq-chevron" />
              </button>
              {isOpen && (
                <div className="faq-answer">
                  <p>{item.answer}</p>
                  {item.bullets && (
                    <ul>
                      {item.bullets.map((b) => <li key={b}>{b}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
