import React, { useState } from 'react';
import logoImage from '@assets/EDU_1766463322650.png';

const LandingPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    schoolName: '',
    studentCount: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Save to database
      const response = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitStatus('success');
        
        // Create WhatsApp message
        const whatsappMessage = `Hello! I'm interested in a demo of the Report Card System.

*My Details:*
Name: ${formData.name}
Phone: ${formData.phone}
School: ${formData.schoolName}
${formData.studentCount ? `Students: ${formData.studentCount}` : ''}
${formData.message ? `Message: ${formData.message}` : ''}`;

        // Open WhatsApp with pre-filled message
        const whatsappUrl = `https://wa.me/256744073812?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappUrl, '_blank');
        
        setFormData({ name: '', phone: '', schoolName: '', studentCount: '', message: '' });
      } else {
        setSubmitStatus('error');
      }
    } catch (err) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src={logoImage} alt="EduSuite Systems" className="w-10 h-10 object-contain" />
              <span className="text-xl font-bold text-[#003D99]">EduSuite Systems</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-[#0052CC] transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-[#0052CC] transition-colors">How It Works</a>
              <a href="#testimonials" className="text-gray-600 hover:text-[#0052CC] transition-colors">Testimonials</a>
              <a href="#contact" className="text-gray-600 hover:text-[#0052CC] transition-colors">Contact</a>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="#/login"
                className="px-4 py-2.5 text-[#003D99] font-medium hover:text-[#0052CC] transition-colors"
              >
                School Login
              </a>
              <a
                href="#contact"
                className="px-5 py-2.5 bg-gradient-to-r from-[#0052CC] to-[#003D99] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300"
              >
                Request Demo
              </a>
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-20 lg:pt-24 pb-12 lg:pb-16 px-4 bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0052CC]/10 rounded-full text-[#0052CC] text-xs sm:text-sm font-medium mb-4">
                <span className="w-2 h-2 bg-[#0052CC] rounded-full animate-pulse"></span>
                Trusted by 50+ Schools in Uganda
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#003D99] leading-tight mb-4">
                Professional Report Cards
                <span className="text-[#0052CC]"> Made Simple</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-600 mb-6 leading-relaxed">
                The complete school management solution for Ugandan primary schools. 
                Generate UNEB-compliant report cards, manage assessments, and track student performance.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <a
                  href="#contact"
                  className="px-6 py-3.5 sm:px-8 sm:py-4 bg-gradient-to-r from-[#0052CC] to-[#003D99] text-white rounded-xl font-semibold text-base sm:text-lg hover:shadow-xl active:scale-95 transition-all duration-300 text-center touch-manipulation"
                >
                  Request a Demo
                </a>
                <a
                  href="#how-it-works"
                  className="px-6 py-3.5 sm:px-8 sm:py-4 border-2 border-[#003D99] text-[#003D99] rounded-xl font-semibold text-base sm:text-lg hover:bg-[#003D99] hover:text-white active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 touch-manipulation"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  See How It Works
                </a>
              </div>
              <div className="mt-6 lg:mt-8 flex items-center justify-center sm:justify-start gap-6 sm:gap-8">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-[#0052CC]">50+</div>
                  <div className="text-xs sm:text-sm text-gray-500">Schools</div>
                </div>
                <div className="h-10 w-px bg-gray-200"></div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-[#0052CC]">10,000+</div>
                  <div className="text-xs sm:text-sm text-gray-500">Students</div>
                </div>
                <div className="h-10 w-px bg-gray-200"></div>
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-[#0052CC]">500+</div>
                  <div className="text-xs sm:text-sm text-gray-500">Teachers</div>
                </div>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#0052CC]/20 to-[#003D99]/20 rounded-3xl blur-2xl"></div>
              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-[#0052CC] to-[#003D99] p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                    <span className="ml-3 text-white/80 text-xs">Report Card Preview</span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0052CC] to-[#003D99] flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-[#003D99] text-sm">YOUR SCHOOL NAME</div>
                    <div className="text-xs text-gray-500">Your School Address</div>
                  </div>
                  <div className="border-t border-b border-gray-100 py-2 text-center">
                    <span className="font-semibold text-[#0052CC] text-sm">END OF TERM REPORT CARD</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-gray-500">Student:</span> <span className="font-medium">John Doe</span></div>
                    <div><span className="text-gray-500">Class:</span> <span className="font-medium">P6 - WISDOM</span></div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[#003D99]">
                          <th className="text-left py-1">Subject</th>
                          <th className="text-center py-1">Marks</th>
                          <th className="text-center py-1">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td className="py-1">English</td><td className="text-center">85</td><td className="text-center text-green-600 font-medium">D2</td></tr>
                        <tr><td className="py-1">Mathematics</td><td className="text-center">78</td><td className="text-center text-green-600 font-medium">C3</td></tr>
                        <tr><td className="py-1">Science</td><td className="text-center">92</td><td className="text-center text-green-600 font-medium">D1</td></tr>
                        <tr><td className="py-1">SST</td><td className="text-center">88</td><td className="text-center text-green-600 font-medium">D2</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div><span className="text-gray-500 text-sm">Division:</span> <span className="font-bold text-green-600">I</span></div>
                    <div><span className="text-gray-500 text-sm">Position:</span> <span className="font-bold text-[#0052CC]">3rd</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-12 lg:py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#003D99] mb-3">
              Everything You Need to Manage Your School
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features designed specifically for Ugandan primary schools following UNEB standards
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ),
                title: 'Multi-School Management',
                description: 'Manage multiple schools from a single dashboard with complete data isolation and school-specific branding.'
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: 'UNEB-Compliant Grading',
                description: 'Automatic grading using official Uganda UNEB standards: D1-F9 grades and Division I-IV classification.'
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: 'Professional PDF Reports',
                description: 'Generate beautiful, branded report cards with your school logo, colors, and customized layouts.'
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: 'Performance Analytics',
                description: 'Track student progress with detailed analytics, division distribution charts, and subject performance insights.'
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
                title: 'Teacher & Admin Roles',
                description: 'Role-based access control with separate permissions for administrators and teachers.'
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                ),
                title: 'Excel/CSV Import',
                description: 'Bulk import students, teachers, and marks from Excel or CSV files with smart data matching.'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-5 sm:p-6 rounded-xl border border-gray-100 hover:border-[#0052CC]/20 hover:shadow-lg active:scale-[0.98] transition-all duration-300 bg-white touch-manipulation"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0052CC]/10 to-[#003D99]/10 flex items-center justify-center text-[#0052CC] mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-[#003D99] mb-2">{feature.title}</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-12 lg:py-16 px-4 bg-gradient-to-br from-[#003D99] to-[#001a4d]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
              Get Started in Minutes
            </h2>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
              Setting up your school is quick and easy. Follow these simple steps to start generating professional report cards.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Create Account', description: 'Sign up and set up your school profile with logo and branding' },
              { step: '2', title: 'Add Students', description: 'Import or manually add your students with class and stream assignments' },
              { step: '3', title: 'Enter Marks', description: 'Teachers enter marks by subject - grades calculate automatically' },
              { step: '4', title: 'Generate Reports', description: 'Download professional PDF report cards for all students' }
            ].map((item, index) => (
              <div key={index} className="relative">
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-[#D4AF37] to-transparent"></div>
                )}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFC107] flex items-center justify-center text-[#003D99] text-2xl font-bold mx-auto mb-4 shadow-lg">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-12 lg:py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#003D99] mb-3">
              Trusted by Schools Across Uganda
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              See what head teachers and administrators are saying about our system
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                quote: "This system has transformed how we manage report cards. What used to take weeks now takes hours. The UNEB-compliant grading is exactly what we needed.",
                name: "Mrs. Sarah Nakato",
                role: "Head Teacher",
                school: "St. Mary's Primary School"
              },
              {
                quote: "The ability to manage multiple branches from one dashboard has been a game-changer for our school group. Each school maintains its own branding.",
                name: "Mr. John Ssempala",
                role: "Director",
                school: "Bright Future Schools"
              },
              {
                quote: "Our teachers love how easy it is to enter marks. The automatic grade calculation saves so much time and eliminates errors.",
                name: "Ms. Grace Apio",
                role: "Deputy Head Teacher",
                school: "Unity Primary School"
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white p-5 sm:p-6 rounded-xl shadow-lg border border-gray-100">
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-4 h-4 text-[#FFD700]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm sm:text-base text-gray-600 mb-4 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0052CC] to-[#003D99] flex items-center justify-center text-white font-bold text-sm">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-[#003D99] text-sm">{testimonial.name}</div>
                    <div className="text-xs text-gray-500">{testimonial.role}, {testimonial.school}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 lg:py-14 px-4 bg-gradient-to-r from-[#0052CC] to-[#003D99]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Transform Your School's Report Cards?
          </h2>
          <p className="text-base sm:text-lg text-white/80 mb-6">
            Join hundreds of schools already using our system. Request a personalized demo today.
          </p>
          <a
            href="#contact"
            className="inline-block px-8 py-3.5 bg-white text-[#0052CC] rounded-xl font-bold text-base sm:text-lg hover:shadow-2xl active:scale-95 transition-all duration-300 touch-manipulation"
          >
            Request a Demo
          </a>
          <p className="text-white/60 mt-3 text-xs sm:text-sm">Get a personalized walkthrough of our system.</p>
        </div>
      </section>

      <section id="contact" className="py-12 lg:py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#003D99] mb-4">
                Request a Demo
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mb-6">
                Interested in our Report Card System? Fill out the form and we'll schedule a personalized demo for your school.
              </p>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0052CC]/10 flex items-center justify-center text-[#0052CC]">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <a href="mailto:luqmanluqs2@gmail.com" className="font-medium text-[#003D99] hover:text-[#0052CC] transition-colors">luqmanluqs2@gmail.com</a>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0052CC]/10 flex items-center justify-center text-[#0052CC]">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Phone</div>
                    <div className="font-medium text-[#1E3A5F]">
                      <a href="tel:+256744073812" className="hover:text-[#7B1113] transition-colors">0744 073 812</a>
                      <span className="text-gray-400 mx-2">|</span>
                      <a href="tel:+256763512762" className="hover:text-[#7B1113] transition-colors">0763 512 762</a>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#7B1113]/10 flex items-center justify-center text-[#7B1113]">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Location</div>
                    <div className="font-medium text-[#1E3A5F]">Kampala, Uganda</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 sm:p-6">
              <div className="mb-5">
                <h3 className="text-lg sm:text-xl font-semibold text-[#1E3A5F] mb-1">Schedule Your Demo</h3>
                <p className="text-xs sm:text-sm text-gray-500">Fill out the form and we'll contact you within 24 hours.</p>
              </div>
              
              {submitStatus === 'success' && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-2 text-green-700">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">Thank you! WhatsApp is opening - just tap send!</span>
                  </div>
                </div>
              )}
              
              {submitStatus === 'error' && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-2 text-red-700">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="font-medium">Something went wrong. Please try again or call us directly.</span>
                  </div>
                </div>
              )}
              
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#7B1113]/20 focus:border-[#7B1113] transition-all text-base touch-manipulation"
                    placeholder="e.g. John Mukasa"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#7B1113]/20 focus:border-[#7B1113] transition-all text-base touch-manipulation"
                    placeholder="e.g. 0772 123 456"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">School Name *</label>
                  <input
                    type="text"
                    value={formData.schoolName}
                    onChange={(e) => setFormData(prev => ({ ...prev, schoolName: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#7B1113]/20 focus:border-[#7B1113] transition-all text-base touch-manipulation"
                    placeholder="e.g. Bright Future Primary School"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Number of Students</label>
                  <select
                    value={formData.studentCount}
                    onChange={(e) => setFormData(prev => ({ ...prev, studentCount: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#7B1113]/20 focus:border-[#7B1113] transition-all bg-white text-base touch-manipulation"
                  >
                    <option value="">Select range</option>
                    <option value="1-100">1 - 100 students</option>
                    <option value="101-300">101 - 300 students</option>
                    <option value="301-500">301 - 500 students</option>
                    <option value="501+">More than 500 students</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Message (Optional)</label>
                  <textarea
                    rows={2}
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#7B1113]/20 focus:border-[#7B1113] transition-all resize-none text-base touch-manipulation"
                    placeholder="Any specific questions?"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white rounded-xl font-semibold hover:shadow-lg active:scale-[0.98] transition-all duration-300 touch-manipulation text-base disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Opening WhatsApp...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Request Demo via WhatsApp
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 text-center">
                  We respect your privacy. Your information will never be shared.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 px-4 bg-[#1E3A5F]">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-white">Luqman EduTech</span>
              </div>
              <p className="text-gray-400 text-sm">
                Professional school management and report card system for Ugandan primary schools.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Updates</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Training</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Data Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} Luqman EduTech Solutions. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
