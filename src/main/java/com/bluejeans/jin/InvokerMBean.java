/*
 * Copyright Blue Jeans Network.
 */
package com.bluejeans.jin;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Method;

import javax.management.JMException;

import org.apache.commons.lang.ClassUtils;

import com.bluejeans.utils.MetaUtil;

/**
 * Invoker MBean
 *
 * @author Dinesh Ilindra
 */
public interface InvokerMBean {

    /**
     * Run any on this.
     *
     * @param name
     *            the name
     * @param args
     *            the arguments
     * @return the result
     * @throws Exception
     *             any problem
     */
    Object runThis(final String name, final String... args) throws Exception;

    /**
     * Print the value by running any on this.
     *
     * @param name
     *            the name
     * @param args
     *            the aeguments
     * @return the print result
     */
    String printThis(final String name, final String... args);

    /**
     * The invoker basic implementation.
     *
     * @author Dinesh Ilindra
     */
    public static class Invoker implements InvokerMBean {

        /**
         * Registers this as MBean.
         */
        public Invoker() {
            try {
                MetaUtil.registerAsMBean(this);
            } catch (final JMException jme) {
                // do nothing.
            }
        }

        /*
         * (non-Javadoc)
         *
         * @see
         * com.bluejeans.common.utils.InvokerMBean#runThis(java.lang.String,
         * java.lang.String[])
         */
        @Override
        public Object runThis(final String name, final String... args) throws Exception {
            int len = 0;
            if (args != null) {
                len = args.length;
            }
            final Object[] invokeArgs = new Object[len];
            final Method method = MetaUtil.findFirstMethod(this.getClass(), name, len);
            for (int index = 0; index < len; index++) {
                Class<?> paramType = method.getParameterTypes()[index];
                try {
                    if (paramType.isPrimitive()) {
                        paramType = ClassUtils.primitiveToWrapper(paramType);
                    }
                    invokeArgs[index] = paramType.getMethod("valueOf", String.class).invoke(null, args[index]);
                } catch (final NoSuchMethodException nsme) {
                    invokeArgs[index] = paramType.getConstructor(String.class).newInstance(args[index]);
                }
            }
            return method.invoke(this, invokeArgs);
        }

        /*
         * (non-Javadoc)
         *
         * @see com.bjn.utils.InvokerMBean#printThis(java.lang.String,
         * java.lang.String[])
         */
        @Override
        public String printThis(final String name, final String... args) {
            String val = null;
            try {
                val = String.valueOf(runThis(name, args));
            } catch (final Exception ex) {
                final StringWriter sw = new StringWriter();
                ex.printStackTrace(new PrintWriter(sw));
                val = sw.toString();
            }
            return val;
        }

    }
}
