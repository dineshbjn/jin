/**
 *
 */
package com.bluejeans.jin;

import java.lang.instrument.ClassDefinition;

import org.apache.commons.io.IOUtils;

import com.bluejeans.utils.javaagent.InstrumentationAgent;
import com.ea.agentloader.AgentLoader;

/**
 * @author Dinesh Ilindra
 *
 */
public class MathTest {

    public int multiply(final int a, final int b) {
        System.out.println("multiplying " + a + " and " + b);
        return a * b;
    }

    public static void main(final String[] args) throws Exception {
        final MathTest test = new MathTest();

        System.out.println(test.multiply(3, 4));

        AgentLoader.loadAgentClass(InstrumentationAgent.class.getName(), "");
        InstrumentationAgent.getInstrumentation()
                .redefineClasses(new ClassDefinition(MathTest.class, IOUtils.toByteArray(MathTest.class
                        .getResourceAsStream("/" + MathTest.class.getName().replace(".", "/") + ".bin"))));

        System.out.println(test.multiply(3, 4));
    }

}
