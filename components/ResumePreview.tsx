import React from 'react';
import { Resume } from '../types';
import { MapPin } from 'lucide-react';
import { Phone } from 'lucide-react';
import { Mail } from 'lucide-react';
import { Linkedin } from 'lucide-react';
import { Globe } from 'lucide-react';
import { Github } from 'lucide-react';
import { ExternalLink } from 'lucide-react';

interface Props {
  resume: Resume;
  id: string; // for html2canvas targeting
}

const ResumePreview: React.FC<Props> = React.memo(({ resume, id }) => {
  
  // Helper to render markdown bolding
  const parseMarkdown = (text: string) => {
    if (!text) return null;
    // Split by **bold**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Helper to safely parse description content regardless of format (string vs array)
  const renderDescription = (description: any) => {
    if (!description) return [];
    
    let lines: string[] = [];
    
    if (Array.isArray(description)) {
      lines = description.map(String);
    } else if (typeof description === 'string') {
      lines = description.split('\n');
    } else {
      // Fallback for unexpected types (e.g. objects, numbers)
      lines = String(description).split('\n');
    }

    return lines
      .filter(line => line && line.trim().length > 0)
      .map(line => line.replace(/^\s*[•\-\*]\s*/, '').trim()); // Robust cleanup of bullet characters
  };

  // Helper to determine if text should be rendered as a list or paragraph
  const renderRichText = (text: any, context: 'summary' | 'default' = 'default') => {
    const lines = renderDescription(text);
    if (lines.length === 0) return null;
    
    // Check if the original text had explicit bullet markers
    const originalString = Array.isArray(text) ? text.join('\n') : String(text);
    const hasBulletPoints = lines.length > 1 || /^\s*[•\-\*]/.test(originalString);

    // If multiple lines or explicit bullets found, render as list
    if (hasBulletPoints) {
      return (
         <ul className="list-disc ml-4 text-sm text-slate-700 leading-snug space-y-1.5 text-left">
           {lines.map((line, i) => (
             <li key={i}>{parseMarkdown(line)}</li>
           ))}
         </ul>
      );
    }
    
    // Default fallback to paragraph
    return (
      <p className="text-sm text-slate-700 leading-relaxed text-justify whitespace-pre-line">
          {parseMarkdown(lines[0])}
      </p>
    );
  };

  return (
    <div 
      id={id}
      className="bg-white text-slate-800 w-[210mm] min-h-[297mm] p-12 shadow-2xl mx-auto relative overflow-hidden"
      style={{ fontFamily: 'Times New Roman, serif' }} 
    >
      {/* Header */}
      <header className="border-b-2 border-slate-800 pb-6 mb-6">
        <h1 className="text-4xl font-bold text-slate-900 uppercase tracking-wider mb-2">
          {resume.personalInfo.fullName || "Your Name"}
        </h1>
        <p className="text-lg font-medium text-slate-600 mb-4 tracking-widest uppercase">
          {resume.title || "Professional Title"}
        </p>
        
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
          {resume.personalInfo.email && (
            <a href={`mailto:${resume.personalInfo.email}`} className="flex items-center gap-1 hover:text-blue-600 cursor-pointer z-10">
              <Mail className="w-3.5 h-3.5" /> {resume.personalInfo.email}
            </a>
          )}
          {resume.personalInfo.phone && (
            <a href={`tel:${resume.personalInfo.phone}`} className="flex items-center gap-1 hover:text-blue-600 cursor-pointer z-10">
              <Phone className="w-3.5 h-3.5" /> {resume.personalInfo.phone}
            </a>
          )}
          {resume.personalInfo.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {resume.personalInfo.location}
            </div>
          )}
          {resume.personalInfo.linkedin && (
            <a href={resume.personalInfo.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 cursor-pointer z-10">
              <Linkedin className="w-3.5 h-3.5" /> LinkedIn
            </a>
          )}
          {resume.personalInfo.website && (
            <a href={resume.personalInfo.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 cursor-pointer z-10">
              <Globe className="w-3.5 h-3.5" /> Portfolio
            </a>
          )}
        </div>
      </header>

      {/* Two Column Layout (Fixed Grid) */}
      <div className="grid grid-cols-[2fr_1fr] gap-8">
        
        {/* Left Column: Main Content */}
        <div className="flex flex-col gap-6">
          
          {/* Summary */}
          {resume.personalInfo.summary && (
            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 mb-2 pb-1">Professional Summary</h3>
              {renderRichText(resume.personalInfo.summary, 'summary')}
            </section>
          )}

          {/* Experience */}
          {resume.experience.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 mb-3 pb-1">Experience</h3>
              <div className="flex flex-col gap-4">
                {resume.experience.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex flex-row justify-between items-baseline mb-1">
                      <h4 className="font-bold text-slate-800 text-base">{exp.role}</h4>
                      <span className="text-xs font-medium text-slate-500 italic flex-shrink-0 ml-2">{exp.startDate} - {exp.endDate}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-700 mb-1">{exp.company}</div>
                    {renderRichText(exp.description)}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Education (Strictly After Experience) */}
          {resume.education.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 mb-3 pb-1">Education</h3>
              <div className="flex flex-col gap-3">
                {resume.education.map((edu) => (
                  <div key={edu.id}>
                    <div className="flex flex-row justify-between items-baseline">
                       <h4 className="font-bold text-slate-800 text-sm">{edu.school}</h4>
                       <span className="text-xs text-slate-500 italic flex-shrink-0 ml-2">{edu.year}</span>
                    </div>
                    <div className="text-sm text-slate-700">{edu.degree}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Projects (Strictly After Education) */}
          {resume.projects.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 mb-3 pb-1">Projects</h3>
              <div className="flex flex-col gap-4">
                {resume.projects.map((proj) => (
                  <div key={proj.id}>
                    <div className="flex flex-row justify-between items-baseline mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-base">{proj.name}</h4>
                        <div className="flex gap-2 text-xs print:hidden">
                          {proj.link && (
                            <a href={proj.link} target="_blank" rel="noreferrer" className="text-blue-600 flex items-center gap-0.5 hover:underline cursor-pointer z-10">
                              <ExternalLink className="w-3 h-3" /> Demo
                            </a>
                          )}
                          {proj.repoLink && (
                            <a href={proj.repoLink} target="_blank" rel="noreferrer" className="text-slate-600 flex items-center gap-0.5 hover:text-black hover:underline cursor-pointer z-10">
                              <Github className="w-3 h-3" /> Code
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-slate-700">
                       {renderRichText(proj.description)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Skills & New Leadership/Activities */}
        <div className="flex flex-col gap-6">
          
          {/* Skills */}
          {resume.skills.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 mb-3 pb-1">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {resume.skills.map((skill, idx) => (
                  <span key={idx} className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-xs font-medium border border-slate-200">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Leadership & Activities */}
          {resume.leadershipActivities.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase border-b border-slate-300 mb-3 pb-1">Leadership & Activities</h3>
              <div className="flex flex-col gap-3">
                {resume.leadershipActivities.map((activity) => (
                  <div key={activity.id}>
                    <div className="flex flex-col mb-1">
                       <h4 className="font-bold text-slate-800 text-sm">{activity.name}</h4>
                       {activity.dateRange && <span className="text-xs text-slate-500 italic">{activity.dateRange}</span>}
                    </div>
                    {renderRichText(activity.description)}
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Invisible Keywords Container (Keyword Hacking) */}
      {resume.hiddenKeywords && resume.hiddenKeywords.length > 0 && (
        <div 
          className="absolute bottom-0 left-0 right-0 text-[1px] text-white opacity-0 pointer-events-none overflow-hidden h-[1px] w-full z-[-1]"
          aria-hidden="true"
        >
          {resume.hiddenKeywords.join(' ')}
        </div>
      )}
    </div>
  );
});

ResumePreview.displayName = 'ResumePreview';

export default ResumePreview;