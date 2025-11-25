import React, { useState } from 'react';
import { Card, Button, Input } from './UIComponents';
import { Briefcase, Search, Check } from 'lucide-react';

interface JobRole {
  id: string;
  title: string;
  category: string;
  description: string;
}

interface JobRoleSelectorProps {
  selectedRole: JobRole | null;
  onRoleSelect: (role: JobRole) => void;
  onCustomRole: (title: string) => void;
}

const commonJobRoles: JobRole[] = [
  // Software Engineering
  { id: 'frontend-dev', title: 'Frontend Developer', category: 'Software Engineering', description: 'React, Vue, Angular, JavaScript, CSS, HTML' },
  { id: 'backend-dev', title: 'Backend Developer', category: 'Software Engineering', description: 'Node.js, Python, Java, APIs, Databases' },
  { id: 'fullstack-dev', title: 'Full Stack Developer', category: 'Software Engineering', description: 'End-to-end web development, multiple technologies' },
  { id: 'mobile-dev', title: 'Mobile Developer', category: 'Software Engineering', description: 'iOS, Android, React Native, Flutter' },
  { id: 'devops-engineer', title: 'DevOps Engineer', category: 'Software Engineering', description: 'CI/CD, Cloud, Infrastructure, Automation' },
  { id: 'data-engineer', title: 'Data Engineer', category: 'Software Engineering', description: 'ETL, Big Data, SQL, NoSQL, Data Pipelines' },
  { id: 'ml-engineer', title: 'Machine Learning Engineer', category: 'Software Engineering', description: 'ML, AI, Python, TensorFlow, PyTorch' },

  // Product & Design
  { id: 'product-manager', title: 'Product Manager', category: 'Product & Design', description: 'Product strategy, roadmapping, user research' },
  { id: 'ux-designer', title: 'UX Designer', category: 'Product & Design', description: 'User experience, wireframing, prototyping' },
  { id: 'ui-designer', title: 'UI Designer', category: 'Product & Design', description: 'User interface, visual design, design systems' },
  { id: 'product-designer', title: 'Product Designer', category: 'Product & Design', description: 'UX/UI design, product thinking, user-centered design' },

  // Data & Analytics
  { id: 'data-scientist', title: 'Data Scientist', category: 'Data & Analytics', description: 'Statistics, ML, data analysis, Python, R' },
  { id: 'data-analyst', title: 'Data Analyst', category: 'Data & Analytics', description: 'SQL, Excel, Tableau, data visualization' },
  { id: 'business-analyst', title: 'Business Analyst', category: 'Data & Analytics', description: 'Requirements, process analysis, stakeholder management' },

  // Leadership & Management
  { id: 'engineering-manager', title: 'Engineering Manager', category: 'Leadership & Management', description: 'Team leadership, technical management, project oversight' },
  { id: 'tech-lead', title: 'Technical Lead', category: 'Leadership & Management', description: 'Technical guidance, architecture, mentoring' },
  { id: 'vp-engineering', title: 'VP of Engineering', category: 'Leadership & Management', description: 'Engineering strategy, organizational leadership' },

  // Other Technical
  { id: 'qa-engineer', title: 'QA Engineer', category: 'Other Technical', description: 'Testing, quality assurance, automation' },
  { id: 'security-engineer', title: 'Security Engineer', category: 'Other Technical', description: 'Cybersecurity, vulnerability assessment, compliance' },
  { id: 'systems-admin', title: 'Systems Administrator', category: 'Other Technical', description: 'Infrastructure, servers, network administration' },
];

const JobRoleSelector: React.FC<JobRoleSelectorProps> = ({ selectedRole, onRoleSelect, onCustomRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customRoleTitle, setCustomRoleTitle] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const categories = [...new Set(commonJobRoles.map(role => role.category))];

  const filteredRoles = commonJobRoles.filter(role =>
    role.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomRoleSubmit = () => {
    if (customRoleTitle.trim()) {
      onCustomRole(customRoleTitle.trim());
      setCustomRoleTitle('');
      setShowCustomInput(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-indigo-400" />
          Select Target Job Role
        </h3>
        <p className="text-slate-400 text-sm">
          Choose the job role you're targeting. This will help AI suggest the most relevant projects and tailor your resume content.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Search job roles..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Selected Role Display */}
      {selectedRole && (
        <Card className="border-indigo-500/50 bg-indigo-900/10">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Selected: {selectedRole.title}
              </h4>
              <p className="text-sm text-slate-400">{selectedRole.category}</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => onRoleSelect(null as any)}
              className="text-xs"
            >
              Change
            </Button>
          </div>
        </Card>
      )}

      {/* Custom Role Input */}
      {showCustomInput && (
        <Card className="border-purple-500/50 bg-purple-900/10">
          <h4 className="font-semibold text-white mb-3">Enter Custom Job Role</h4>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Senior React Developer"
              value={customRoleTitle}
              onChange={(e) => setCustomRoleTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCustomRoleSubmit()}
              className="flex-1"
            />
            <Button onClick={handleCustomRoleSubmit} disabled={!customRoleTitle.trim()}>
              Add
            </Button>
            <Button variant="secondary" onClick={() => setShowCustomInput(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Job Roles Grid */}
      {!showCustomInput && (
        <div className="space-y-6">
          {categories.map(category => {
            const categoryRoles = filteredRoles.filter(role => role.category === category);
            if (categoryRoles.length === 0) return null;

            return (
              <div key={category}>
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{category}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryRoles.map(role => (
                    <Card
                      key={role.id}
                      className={`cursor-pointer transition-all hover:border-indigo-500/50 ${
                        selectedRole?.id === role.id ? 'border-indigo-500 bg-indigo-900/20' : 'hover:bg-slate-800/50'
                      }`}
                      onClick={() => onRoleSelect(role)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-white mb-1">{role.title}</h5>
                          <p className="text-xs text-slate-400 leading-relaxed">{role.description}</p>
                        </div>
                        {selectedRole?.id === role.id && (
                          <Check className="w-5 h-5 text-indigo-400 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Custom Role Button */}
          <div className="text-center pt-4 border-t border-slate-800">
            <Button
              variant="secondary"
              onClick={() => setShowCustomInput(true)}
              className="text-sm"
            >
              + Add Custom Job Role
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobRoleSelector;