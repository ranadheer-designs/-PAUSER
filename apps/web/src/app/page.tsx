'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { AuthModal } from '@/components/Auth/AuthModal';
import Hero from '@/components/Hero/Hero';
import styles from './page.module.css';

// Demo video ID
const DEMO_VIDEO_ID = "dQw4w9WgXcQ";

export default function LandingPage() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  return (
    <main className={styles.main} ref={containerRef}>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      
      {/* Hero Section */}
      <Hero onStart={() => setIsAuthOpen(true)} />

      {/* Feature 1: Bookmarks */}
      <FeatureSection 
        title="Bookmark the moment."
        description="Don't just write notes. Pin them to the exact second in the video. When you review later, you'll be transported back to that precise context instantly."
        image="/assets/bookmark-feature.png"
        align="left"
      />

      {/* Feature 2: DeepFocus */}
      <FeatureSection 
        title="Distraction is the enemy."
        description="DeepFocus mode blocks unrelated recommendations, comments, and noise. A pure, calm interface designed solely for learning and retention."
        image="/assets/focus-bg.png"
        align="right"
      />

      <ContactSection />

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <p>© 2026 Pauser. Designed for Focus.</p>
        </div>
      </footer>
    </main>
  );
}

function ContactSection() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const infoY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const formY = useTransform(scrollYProgress, [0, 1], [20, -20]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error('Contact form error:', err);
      setStatus('error');
    }
  };

  return (
    <section className={styles.contactSection} ref={sectionRef}>
      <div className={styles.container}>
        <div className={styles.contactGrid}>
          <motion.div style={{ y: infoY }} className={styles.contactInfo}>
            <h2 className={styles.contactTitle}>Let's talk about <br />your learning.</h2>
            <p className={styles.contactSubtitle}>
              Have questions or feedback? We'd love to hear from you.
            </p>
          </motion.div>

          <motion.div style={{ y: formY }}>
            {status === 'success' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={styles.successMessage}
              >
                <h3>Message Sent Successfully</h3>
                <p>Thank you for reaching out. We'll get back to you shortly.</p>
                <button 
                  onClick={() => setStatus('idle')}
                  style={{ marginTop: '16px', background: 'transparent', border: '1px solid #22C3A6', color: '#22C3A6', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Send another message
                </button>
              </motion.div>
            ) : (
              <form className={styles.contactForm} onSubmit={handleSubmit}>
                <h3 className={styles.formTitle}>Let's connect</h3>
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Your name"
                      className={styles.formInput} 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Email</label>
                    <input 
                      type="email" 
                      required
                      placeholder="you@example.com"
                      className={styles.formInput}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Message</label>
                  <textarea 
                    required
                    placeholder="How can we help?"
                    className={styles.formTextarea}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>
                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? 'Sending...' : 'Send Message'}
                </button>
                {status === 'error' && (
                  <p style={{ color: '#F06A6A', marginTop: '12px', fontSize: '14px' }}>
                    Something went wrong. Please try again.
                  </p>
                )}
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FeatureSection({ title, description, image, align }: { title: string, description: string, image: string, align: 'left' | 'right' }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  return (
    <section className={styles.featureSection} ref={ref}>
      <div className={styles.container}>
        <div className={styles.featureGrid} style={{ direction: align === 'right' ? 'rtl' : 'ltr' }}>
          
          <div className={styles.featureContent} style={{ direction: 'ltr' }}>
            <motion.div
              initial={{ opacity: 0, x: align === 'left' ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ margin: "-10%" }} // Removed 'once: true' to allow re-animation
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h2 className={styles.featureTitle}>{title}</h2>
              <p className={styles.featureText}>{description}</p>
            </motion.div>
          </div>

          <div className={styles.featureVisual} style={{ direction: 'ltr' }}>
            <motion.div
              style={{ position: 'relative', width: '100%', height: '100%', y }} 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ margin: "-20%" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className={styles.glow} style={{ 
                left: '50%', 
                top: '50%', 
                transform: 'translate(-50%, -50%)',
                background: title.includes('Focus') 
                  ? 'radial-gradient(circle, rgba(59, 75, 216, 0.25) 0%, rgba(11, 13, 15, 0) 70%)'
                  : 'radial-gradient(circle, rgba(34, 195, 166, 0.2) 0%, rgba(11, 13, 15, 0) 70%)'
              }} />
              <div style={{ position: 'relative', width: '100%', height: '400px' }}>
                <Image 
                  src={image} 
                  alt={title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: 'contain' }}
                  className={styles.featureImage}
                />
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
