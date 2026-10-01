import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { TrendingUp, LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'red' | 'indigo' | 'orange' | 'cyan' | 'purple' | 'amber';
  trend?: string;
  loading?: boolean;
  delay?: number;
  size?: 'md' | 'sm' | 'xs';
}

export const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue',
  trend,
  loading,
  delay = 0,
  size = 'md'
}: StatCardProps) => {
  const gradientClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    red: 'from-rose-500 to-rose-600',
    indigo: 'from-indigo-500 to-indigo-600',
    orange: 'from-orange-500 to-orange-600',
    cyan: 'from-cyan-500 to-cyan-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600'
  };

  const textClasses = {
    blue: 'text-blue-100',
    green: 'text-emerald-100',
    red: 'text-rose-100',
    indigo: 'text-indigo-100',
    orange: 'text-orange-100',
    cyan: 'text-cyan-100',
    purple: 'text-purple-100',
    amber: 'text-amber-100'
  };

  const sizeConfig = size === 'xs'
    ? {
        padding: 'px-2 py-1.5 sm:px-2 sm:py-1.5',
        title: 'text-[7px] sm:text-[8px]',
        value: 'text-sm sm:text-[15px]',
        icon: 11,
        trend: 'text-[8px] sm:text-[9px]',
        space: 'space-y-0.5',
        iconWrap: 'p-0.5 rounded-md',
        headerAlign: 'items-center',
        titleWrap: 'min-w-0 flex-1',
        minHeight: 'min-h-[54px] sm:min-h-[58px]'
      }
    : size === 'sm'
    ? {
        padding: 'p-4 sm:p-5',
        title: 'text-[10px] sm:text-xs',
        value: 'text-xl sm:text-2xl',
        icon: 20,
        trend: 'text-[10px] sm:text-xs',
        space: 'space-y-3 sm:space-y-4',
        iconWrap: 'p-2 rounded-lg',
        headerAlign: 'items-start',
        titleWrap: '',
        minHeight: ''
      }
    : {
        padding: 'p-6',
        title: 'text-xs',
        value: 'text-3xl',
        icon: 24,
        trend: 'text-xs',
        space: 'space-y-4',
        iconWrap: 'p-2 rounded-lg',
        headerAlign: 'items-start',
        titleWrap: '',
        minHeight: ''
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -5 }}
      className="h-full"
    >
      <Card className={cn("h-full relative overflow-hidden group border-none text-white bg-gradient-to-br", gradientClasses[color] || gradientClasses.blue)}>
        <div className={cn(sizeConfig.padding, sizeConfig.minHeight)}>
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-2 w-24 bg-white/50 rounded" />
              <div className="h-8 w-16 bg-white/50 rounded" />
              <div className="h-1 w-full bg-white/20 rounded" />
            </div>
          ) : (
            <div className={cn(sizeConfig.space)}>
              <div className={cn("flex justify-between gap-2", sizeConfig.headerAlign)}>
                <div className={cn("space-y-0.5", sizeConfig.titleWrap)}>
                  <p className={cn(sizeConfig.title, "font-medium uppercase tracking-wider leading-tight", textClasses[color] || textClasses.blue)}>
                    {title}
                  </p>
                  <h3 className={cn(sizeConfig.value, "font-extrabold leading-none text-white")}>
                    {value}
                  </h3>
                </div>
                <div className={cn("bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110", sizeConfig.iconWrap)}>
                  <Icon size={sizeConfig.icon} className="text-white" />
                </div>
              </div>
              
              {trend && (
                <div className={cn("flex items-center gap-1.5", textClasses[color] || textClasses.blue)}>
                  <TrendingUp size={14} className="currentColor" />
                  <span className={cn(sizeConfig.trend, "font-semibold")}>
                    {trend}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
