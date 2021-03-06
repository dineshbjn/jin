/*
 * Copyright Blue Jeans Network.
 */
package com.bluejeans.jin;

/**
 * Invoker test
 *
 * @author Dinesh Ilindra
 */
public class InvokerTest {

    /**
     * @param args
     */
    public static void main(final String[] args) throws Exception {
        System.err.println(System.getProperty("java.io.tmpdir"));
        final InvokerSpringBean invoker = new InvokerSpringBean();
        // invoker.setContextPrefix("test");
        invoker.getService().getInvoker().setTarget(new StringBuilder("again"));
        invoker.getService().getInvoker().setTarget("test", invoker);
        // invoker.setExtjsResourcePrefix("https://cdn.rawgit.com/cdnjs/cdnjs/master/ajax/libs/extjs/4.2.1");
        invoker.init();
    }

}
