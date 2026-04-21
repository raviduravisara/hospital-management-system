import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';

/* --- Mock Data --- */
const SERVICES = [
  {
    title: 'Emergency Care',
    desc: '24/7 emergency services with rapid-response trauma teams, critical care specialists and life-saving equipment.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
    ),
    color: 'bg-red-50 text-red-600 border-red-100',
    iconBg: 'bg-red-100',
  },
  {
    title: 'Cardiology',
    desc: 'Advanced heart care with cutting-edge diagnostics, interventional cardiology and cardiac surgery.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    ),
    color: 'bg-pink-50 text-pink-600 border-pink-100',
    iconBg: 'bg-pink-100',
  },
  {
    title: 'Neurology',
    desc: "Comprehensive neurological care covering stroke, epilepsy, Parkinson's disease and headache disorders.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    ),
    color: 'bg-purple-50 text-purple-600 border-purple-100',
    iconBg: 'bg-purple-100',
  },
  {
    title: 'Pediatrics',
    desc: 'Child-centered healthcare from newborns to adolescents, with a nurturing environment for young patients.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    ),
    color: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    iconBg: 'bg-yellow-100',
  },
  {
    title: 'Orthopedics',
    desc: 'Expert bone, joint and muscle care with minimally invasive surgery and advanced rehabilitation programs.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    ),
    color: 'bg-blue-50 text-blue-600 border-blue-100',
    iconBg: 'bg-blue-100',
  },
  {
    title: 'Radiology',
    desc: 'State-of-the-art imaging including MRI, CT scans, ultrasound and X-ray with rapid reporting by expert radiologists.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
    ),
    color: 'bg-teal-50 text-teal-600 border-teal-100',
    iconBg: 'bg-teal-100',
  },
];

const FALLBACK_DOCTORS = [
  {
    name: 'Dr. Sarah Mitchell',
    specialty: 'Cardiologist',
    experience: '18 years',
    rating: 4.9,
    patients: '3,200+',
    initials: 'SM',
    color: 'bg-pink-500',
  },
  {
    name: 'Dr. James Harrington',
    specialty: 'Neurologist',
    experience: '22 years',
    rating: 4.8,
    patients: '2,800+',
    initials: 'JH',
    color: 'bg-purple-500',
  },
  {
    name: 'Dr. Anika Patel',
    specialty: 'Pediatrician',
    experience: '14 years',
    rating: 4.9,
    patients: '4,500+',
    initials: 'AP',
    color: 'bg-yellow-500',
  },
  {
    name: 'Dr. Michael Torres',
    specialty: 'Orthopedic Surgeon',
    experience: '20 years',
    rating: 4.7,
    patients: '1,900+',
    initials: 'MT',
    color: 'bg-blue-500',
  },
];

const FALLBACK_STATS = [
  { value: '50,000+', label: 'Patients Treated' },
  { value: '120+',    label: 'Specialist Doctors' },
  { value: '35+',     label: 'Years of Excellence' },
  { value: '98%',     label: 'Patient Satisfaction' },
];

const WHY_US = [
  {
    title: 'World-Class Facilities',
    desc: 'State-of-the-art medical equipment and modernised wards designed for patient comfort and clinical efficiency.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    ),
  },
  {
    title: 'Personalised Care',
    desc: 'Every patient receives a tailored care plan crafted by our multidisciplinary clinical teams.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    ),
  },
  {
    title: 'Digital-First Platform',
    desc: 'Book appointments, view test results and manage records online through the HEALIX portal anytime, anywhere.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    ),
  },
  {
    title: 'Round-the-Clock Support',
    desc: 'Our clinical helpdesk, emergency hotline and on-call specialists are available 24 hours a day, 7 days a week.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
];

const NAV_LINKS = ['services', 'doctors', 'about', 'contact'];

/* --- Star Rating --- */
function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`w-3.5 h-3.5 ${s <= Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.449a1 1 0 00-1.175 0l-3.37 2.449c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-gray-500 font-medium">{rating}</span>
    </div>
  );
}
const PUBLIC_API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'https://hospital-management-api-avaechaue2fdghdk.southeastasia-01.azurewebsites.net';

/* --- Home Page --- */
export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuredDoctors, setFeaturedDoctors] = useState(FALLBACK_DOCTORS);
const [stats, setStats] = useState(FALLBACK_STATS);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
  const loadHomepageData = async () => {
    try {
      const [doctorsRes, patientsCountRes] = await Promise.all([
        axios.get(`${PUBLIC_API_BASE}/api/doctors`, {
          headers: { 'Content-Type': 'application/json' },
        }),
        axios.get(`${PUBLIC_API_BASE}/api/patients/count`, {
           headers: { 'Content-Type': 'application/json' },
        }).catch(() => ({ data: { count: 50000 } }))
      ]);

      const doctors = Array.isArray(doctorsRes.data) ? doctorsRes.data : [];
      const patientsCount = patientsCountRes.data?.count || 50000;

      if (doctors.length > 0) {
        const mappedDoctors = doctors.slice(0, 4).map((doctor, index) => {
          const firstName = doctor.firstName || '';
          const lastName = doctor.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim() || 'Doctor';
          const initials =
            `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'DR';

          const colors = [
            'bg-pink-500',
            'bg-purple-500',
            'bg-yellow-500',
            'bg-blue-500',
          ];

          return {
            name: `Dr. ${fullName}`,
            specialty: doctor.specialization || 'Specialist',
            experience: doctor.experience ? `${doctor.experience} years` : 'Experienced',
            rating: doctor.rating || 4.8,
            patients: 'Active',
            initials,
            color: colors[index % colors.length],
          };
        });

        setFeaturedDoctors(mappedDoctors);

        setStats([
          { value: `${patientsCount.toLocaleString()}+`, label: 'Patients Treated' },
          { value: `${doctors.length}+`, label: 'Specialist Doctors' },
          { value: '35+', label: 'Years of Excellence' },
          { value: '98%', label: 'Patient Satisfaction' },
        ]);
      }
    } catch (error) {
      console.error('Homepage live data load failed:', error);
      setFeaturedDoctors(FALLBACK_DOCTORS);
      setStats(FALLBACK_STATS);
    }
  };

  loadHomepageData();
}, []);


  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="font-sans text-gray-800 overflow-x-hidden">

      {/* Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-sm shadow-md' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 select-none">
            <img src="/logo.png" alt="HEALIX" className="h-9 w-9 object-contain" />
            <span className={`text-xl font-extrabold tracking-tight ${scrolled ? 'text-gray-900' : 'text-white'}`}>
              HEALIX
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((id) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`text-sm font-medium capitalize transition-colors ${
                  scrolled ? 'text-gray-600 hover:text-blue-600' : 'text-white/90 hover:text-white'
                }`}
              >
                {id}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className={`text-sm font-semibold px-4 py-2 rounded-full border transition-all ${
                scrolled
                  ? 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white'
                  : 'border-white text-white hover:bg-white hover:text-blue-600'
              }`}
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md"
            >
              Sign Up
            </Link>
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className={`w-6 h-6 ${scrolled ? 'text-gray-800' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg px-4 pb-4 pt-2 flex flex-col gap-3">
            {NAV_LINKS.map((id) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="text-left text-sm font-medium text-gray-700 hover:text-blue-600 capitalize py-1">
                {id}
              </button>
            ))}
            <div className="flex gap-3 pt-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center text-sm font-semibold py-2 border border-blue-600 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all">
                Log In
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center text-sm font-semibold py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all">
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: "url('/hero.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Accepting New Patients - Book Today
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6"
            style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
            Exceptional Care,<br />
            <span className="text-blue-300">Every Step</span> of the Way.
          </h1>

          <p className="text-lg sm:text-xl text-white/85 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
            HEALIX brings together world-class physicians, advanced technology and compassionate support to deliver healthcare that puts you first.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-full shadow-xl hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5"
            >
              Get Started - It&apos;s Free
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/40 text-white font-bold text-base rounded-full shadow-lg transition-all hover:-translate-y-0.5"
            >
              Sign In to Portal
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 flex flex-col items-center gap-1 animate-bounce">
          <span className="text-xs tracking-widest uppercase font-medium">Scroll</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-blue-600 py-14">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl sm:text-4xl font-extrabold text-white mb-1">{value}</p>
              <p className="text-sm font-medium text-blue-100">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-blue-600 text-sm font-bold uppercase tracking-widest">What We Offer</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900">Our Specialties</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              From emergency response to long-term specialist care, HEALIX covers every aspect of your health journey.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map(({ title, desc, icon, color, iconBg }) => (
              <article key={title}
                className={`rounded-2xl border p-6 hover:shadow-lg transition-shadow cursor-default ${color}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconBg}`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">{icon}</svg>
                </div>
                <h3 className="text-base font-bold mb-2">{title}</h3>
                <p className="text-sm leading-relaxed opacity-80">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors */}
      <section id="doctors" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-blue-600 text-sm font-bold uppercase tracking-widest">Meet the Team</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900">Our Featured Specialists</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              Board-certified clinicians with decades of combined experience and a passion for exceptional patient outcomes.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredDoctors.map(({ name, specialty, experience, rating, patients, initials, color }) => (
              <div key={name}
                className="rounded-2xl border border-gray-100 bg-white p-6 hover:shadow-xl transition-shadow flex flex-col items-center text-center gap-3">
                <div className={`w-16 h-16 rounded-full ${color} flex items-center justify-center text-white text-xl font-extrabold shadow-md`}>
                  {initials}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{name}</h3>
                  <p className="text-xs text-blue-600 font-semibold mt-0.5">{specialty}</p>
                </div>
                <StarRating rating={rating} />
                <div className="flex gap-4 text-xs text-gray-500">
                  <span><strong className="text-gray-700">{experience}</strong> exp.</span>
                  <span><strong className="text-gray-700">{patients}</strong> patients</span>
                </div>
                <Link to="/register"
                  className="w-full mt-1 text-xs font-semibold py-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-full border border-blue-200 hover:border-blue-600 transition-all">
                  Book Appointment
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section id="about" className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-blue-600 text-sm font-bold uppercase tracking-widest">Why HEALIX</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900">Healthcare Reimagined</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              We combine clinical excellence with technology and compassion to set a new standard in patient-centred care.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {WHY_US.map(({ title, desc, icon }) => (
              <div key={title} className="flex gap-5 bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">{icon}</svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 bg-blue-700">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to take charge of your health?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Join thousands of patients and healthcare professionals already using HEALIX.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="px-8 py-3.5 bg-white text-blue-700 font-bold rounded-full shadow-lg hover:bg-blue-50 transition-all hover:-translate-y-0.5">
              Create Free Account
            </Link>
            <Link to="/login"
              className="px-8 py-3.5 border-2 border-white text-white font-bold rounded-full hover:bg-white/10 transition-all hover:-translate-y-0.5">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-blue-600 text-sm font-bold uppercase tracking-widest">Get In Touch</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900">Contact Us</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Emergency Hotline',
                value: '0812345678',
                sub: 'Available 24/7',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />,
              },
              {
                title: 'Hospital Address',
                value: '45 Healix Marine Drive',
                sub: 'Wellawatta, Colombo 06',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />,
              },
              {
                title: 'Email Us',
                value: 'care@healix.health',
                sub: 'Response within 24 hours',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
              },
            ].map(({ title, value, sub, icon }) => (
              <div key={title} className="bg-white rounded-2xl p-6 shadow-sm flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">{icon}</svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{title}</p>
                  <p className="font-bold text-gray-900 text-sm">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="HEALIX" className="h-8 w-8 object-contain opacity-90" />
            <span className="text-white font-extrabold text-lg">HEALIX</span>
          </div>
          <p className="text-sm text-center md:text-left">
            &copy; {new Date().getFullYear()} HEALIX Hospital Management System. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs">
            <button onClick={() => scrollTo('services')} className="hover:text-white transition-colors">Services</button>
            <button onClick={() => scrollTo('doctors')} className="hover:text-white transition-colors">Doctors</button>
            <button onClick={() => scrollTo('contact')} className="hover:text-white transition-colors">Contact</button>
            <Link to="/login" className="hover:text-white transition-colors">Portal</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
