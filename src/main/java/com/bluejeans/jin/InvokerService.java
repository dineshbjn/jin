/*
 * Copyright Blue Jeans Network.
 */
package com.bluejeans.jin;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.Writer;
import java.lang.instrument.ClassDefinition;
import java.lang.instrument.Instrumentation;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;

import com.bluejeans.utils.MetaUtil;
import com.bluejeans.utils.URIInvoker;
import com.bluejeans.utils.javaagent.InstrumentationAgent;
import com.ea.agentloader.AgentLoader;
import com.google.gson.Gson;
import py4j.GatewayServer;

import fi.iki.elonen.SimpleWebServer;
import io.netty.bootstrap.ServerBootstrap;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelFutureListener;
import io.netty.channel.ChannelHandler.Sharable;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.ServerChannel;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.http.DefaultFullHttpResponse;
import io.netty.handler.codec.http.FullHttpRequest;
import io.netty.handler.codec.http.FullHttpResponse;
import io.netty.handler.codec.http.HttpMethod;
import io.netty.handler.codec.http.HttpObjectAggregator;
import io.netty.handler.codec.http.HttpRequestDecoder;
import io.netty.handler.codec.http.HttpResponseEncoder;
import io.netty.handler.codec.http.HttpResponseStatus;
import io.netty.handler.codec.http.HttpVersion;
import io.netty.util.CharsetUtil;

/**
 * Invoker Service
 *
 * @author Dinesh Ilindra
 */
public class InvokerService {

    /**
     * Info buffer.
     *
     * @author Dinesh Ilindra
     */
    public static class InvokerInfoBuffer extends Writer implements Cloneable {

        /**
         * The minimum capacity of the buffer.
         */
        public static final int MIN_CAPACITY = Short.MAX_VALUE;

        /**
         * The default maximum capacity of the buffer.
         */
        public static final int MAX_CAPACITY = 1024 * 1024;

        /**
         * The double maximum capacity of the buffer.
         */
        public static final int DOUBLE_MAX_CAPACITY = 2 * 1024 * 1024;

        /**
         * The append chunk size.
         */
        public static final int CHUNK_LENGTH = Byte.MAX_VALUE;

        private static final byte[] nullBytes = "[null]".getBytes(CharsetUtil.UTF_8);

        private final ByteBuf byteBuf;

        private final Charset charset;

        private final int maxCapacity;

        /**
         * Creates default info buffer with unpooled heap buffer and UTF8 charset.
         */
        public InvokerInfoBuffer() {
            this(Unpooled.buffer(InvokerInfoBuffer.MIN_CAPACITY, InvokerInfoBuffer.MAX_CAPACITY), CharsetUtil.UTF_8);
        }

        /**
         * Creates default info buffer with unpooled heap buffer and UTF8 charset.
         *
         * @param maxCapacity
         *            the maximum capacity
         */
        public InvokerInfoBuffer(final int maxCapacity) {
            this(Unpooled.buffer(InvokerInfoBuffer.MIN_CAPACITY, maxCapacity), CharsetUtil.UTF_8);
        }

        /**
         * @param byteBuf
         *            the byte buffer
         * @param charset
         *            the charset
         */
        public InvokerInfoBuffer(final ByteBuf byteBuf, final Charset charset) {
            this.byteBuf = byteBuf;
            this.charset = charset;
            maxCapacity = byteBuf.capacity();
        }

        /**
         * @return the byteBuf
         */
        public ByteBuf getByteBuf() {
            return byteBuf;
        }

        /**
         * @return the charset
         */
        public Charset getCharset() {
            return charset;
        }

        /**
         * @return the maxCapacity
         */
        public int getMaxCapacity() {
            return maxCapacity;
        }

        /**
         * The string value of the byte buf.
         *
         * @return the value
         */
        public String getValue() {
            return byteBuf.toString(charset);
        }

        /**
         * Returns true if and only if this string representation of the buffer contains the
         * specified sequence of char values.
         *
         * @param sequence
         *            the char sequence
         * @return true if contains
         * @see String#contains(CharSequence)
         */
        public boolean contains(final CharSequence sequence) {
            return getValue().contains(sequence);
        }

        /**
         * Transfers the specified byte data, to the buffer starting at the current writerIndex and
         * increases the writerIndex by the number of the transferred bytes (= bytes.length).
         *
         * @param bytes
         *            the bytes
         * @return this byte buffer
         * @see ByteBuf#writeBytes(byte[])
         */
        public ByteBuf append(final byte[] bytes) {
            if (bytes == null) {
                byteBuf.writeBytes(InvokerInfoBuffer.nullBytes);
            } else {
                byte[] chunk = null;
                final int len = bytes.length;
                try {
                    for (int index = 0; index < len / InvokerInfoBuffer.CHUNK_LENGTH; index++) {
                        chunk = Arrays.copyOfRange(bytes, index * InvokerInfoBuffer.CHUNK_LENGTH,
                                (index + 1) * InvokerInfoBuffer.CHUNK_LENGTH);
                        byteBuf.writeBytes(chunk);
                    }
                    byteBuf.writeBytes(Arrays.copyOfRange(bytes, len - len % InvokerInfoBuffer.CHUNK_LENGTH, len));
                } catch (final IndexOutOfBoundsException iobe) {
                    // do nothing.
                }
            }
            return byteBuf;
        }

        /**
         * Transfers the specified strings byte data, based on the charset, to the buffer starting
         * at the current writerIndex and increases the writerIndex by the number of the transferred
         * bytes (= bytes.length).
         *
         * @param str
         *            the string
         * @return this byte buffer
         * @see ByteBuf#writeBytes(byte[])
         */
        public ByteBuf append(final String str) {
            if (str == null) {
                byteBuf.writeBytes(InvokerInfoBuffer.nullBytes);
            } else {
                String chunk = null;
                final int len = str.length();
                try {
                    for (int index = 0; index < len / InvokerInfoBuffer.CHUNK_LENGTH; index++) {
                        chunk = str.substring(index * InvokerInfoBuffer.CHUNK_LENGTH,
                                (index + 1) * InvokerInfoBuffer.CHUNK_LENGTH);
                        byteBuf.writeBytes(chunk.getBytes(charset));
                    }
                    byteBuf.writeBytes(
                            str.substring(len - len % InvokerInfoBuffer.CHUNK_LENGTH, len).getBytes(charset));
                } catch (final IndexOutOfBoundsException iobe) {
                    // do nothing.
                }
            }
            return byteBuf;
        }

        /**
         * Appends the given value as a string to the buffer. The argument is converted to a string
         * as if by the method String.valueOf, and the characters of that string are then appended
         * to the buffer.
         *
         * @param booleanValue
         *            the boolean value
         * @return this byte buffer
         */
        public ByteBuf append(final boolean booleanValue) {
            return append(String.valueOf(booleanValue));
        }

        /**
         * Appends the given value as a string to the buffer. The argument is converted to a string
         * as if by the method String.valueOf, and the characters of that string are then appended
         * to the buffer.
         *
         * @param intValue
         *            the int value
         * @return this byte buffer
         */
        public ByteBuf append(final int intValue) {
            return append(String.valueOf(intValue));
        }

        /**
         * Appends the given value as a string to the buffer. The argument is converted to a string
         * as if by the method String.valueOf, and the characters of that string are then appended
         * to the buffer.
         *
         * @param longValue
         *            the long value
         * @return this byte buffer
         */
        public ByteBuf append(final long longValue) {
            return append(String.valueOf(longValue));
        }

        /**
         * Appends the given value as a string to the buffer. The argument is converted to a string
         * as if by the method String.valueOf, and the characters of that string are then appended
         * to the buffer.
         *
         * @param obj
         *            the object
         * @return this byte buffer
         */
        public ByteBuf append(final Object obj) {
            return append(String.valueOf(obj));
        }

        /*
         * (non-Javadoc)
         *
         * @see java.io.Writer#append(java.lang.CharSequence)
         */
        @Override
        public Writer append(final CharSequence csq) throws IOException {
            append(String.valueOf(csq));
            return this;
        }

        /*
         * (non-Javadoc)
         *
         * @see java.io.Writer#append(java.lang.CharSequence, int, int)
         */
        @Override
        public Writer append(final CharSequence csq, final int start, final int end) throws IOException {
            return append(csq.subSequence(start, end));
        }

        /*
         * (non-Javadoc)
         *
         * @see java.io.Writer#append(char)
         */
        @Override
        public Writer append(final char ch) throws IOException {
            append(String.valueOf(ch));
            return this;
        }

        /*
         * (non-Javadoc)
         *
         * @see java.io.Writer#write(char[], int, int)
         */
        @Override
        public void write(final char[] cbuf, final int off, final int len) throws IOException {
            String chunk = null;
            try {
                for (int index = 0; index < len / InvokerInfoBuffer.CHUNK_LENGTH; index++) {
                    chunk = new String(cbuf, off + index * InvokerInfoBuffer.CHUNK_LENGTH,
                            InvokerInfoBuffer.CHUNK_LENGTH);
                    byteBuf.writeBytes(chunk.getBytes(charset));
                }
                byteBuf.writeBytes(new String(cbuf, len - off - (len - off) % InvokerInfoBuffer.CHUNK_LENGTH,
                        len % InvokerInfoBuffer.CHUNK_LENGTH).getBytes(charset));
            } catch (final IndexOutOfBoundsException iobe) {
                // do nothing.
            }
        }

        /**
         * Appends a String and return this object.
         *
         * @param str
         *            the string
         * @return this buffer
         */
        public InvokerInfoBuffer appendString(final String str) {
            append(str);
            return this;
        }

        /*
         * (non-Javadoc)
         *
         * @see java.io.Writer#flush()
         */
        @Override
        public void flush() throws IOException {
            // Do nothing.
        }

        /*
         * (non-Javadoc)
         *
         * @see java.io.Writer#close()
         */
        @Override
        public void close() throws IOException {
            byteBuf.release(byteBuf.refCnt());
        }

        /**
         * Resets the indexes.
         */
        public void reset() {
            byteBuf.clear();
        }

        /*
         * (non-Javadoc)
         *
         * @see java.lang.Object#clone()
         */
        @SuppressWarnings("resource")
        @Override
        protected InvokerInfoBuffer clone() {
            return new InvokerInfoBuffer().appendString(getValue());
        }

    }

    /**
     * Netty Server reference.
     *
     * @author Dinesh Ilindra
     * @param <T>
     *            the channel initializer
     */
    public static class NettyServerRef<T extends ChannelInitializer<SocketChannel>> {

        private final ServerBootstrap serverBootstrap;

        private final T channelInitializer;

        private final EventLoopGroup parentGroup;

        private final EventLoopGroup childGroup;

        private final Class<? extends ServerChannel> serverChannel;

        private int port;

        /**
         * @param serverBootstrap
         *            the server bootstrap
         * @param channelInitializer
         *            the channel initializer
         * @param parentGroup
         *            the parent group
         * @param childGroup
         *            the child group
         * @param serverChannel
         *            the server channel
         */
        public NettyServerRef(final ServerBootstrap serverBootstrap, final T channelInitializer,
                final EventLoopGroup parentGroup, final EventLoopGroup childGroup,
                final Class<? extends ServerChannel> serverChannel) {
            this.serverBootstrap = serverBootstrap;
            this.channelInitializer = channelInitializer;
            this.parentGroup = parentGroup;
            this.childGroup = childGroup;
            this.serverChannel = serverChannel;
        }

        /**
         * @return the serverBootstrap
         */
        public ServerBootstrap getServerBootstrap() {
            return serverBootstrap;
        }

        /**
         * @return the channelInitializer
         */
        public T getChannelInitializer() {
            return channelInitializer;
        }

        /**
         * @return the parentGroup
         */
        public EventLoopGroup getParentGroup() {
            return parentGroup;
        }

        /**
         * @return the childGroup
         */
        public EventLoopGroup getChildGroup() {
            return childGroup;
        }

        /**
         * Init only server bootstrap
         */
        public void initServerBootstrap() {
            getServerBootstrap().group(getParentGroup(), getChildGroup()).childHandler(getChannelInitializer())
                    .channel(serverChannel);
        }

        /**
         * The port to bind to.
         *
         * @param port
         *            the port
         */
        public void initWithPort(final int port) {
            this.port = port;
            getServerBootstrap().localAddress(port);
        }

        /**
         * Shutdown this server ref.
         */
        public void shutdown() {
            parentGroup.shutdownGracefully(100, 100, TimeUnit.MILLISECONDS);
            childGroup.shutdownGracefully(100, 100, TimeUnit.MILLISECONDS);
        }

        /**
         * @return the serverChannel
         */
        public Class<? extends ServerChannel> getServerChannel() {
            return serverChannel;
        }

        /**
         * @return the port
         */
        public int getPort() {
            return port;
        }

    }

    /**
     * Invoker server handler.
     *
     * @author Dinesh Ilindra
     */
    @Sharable
    public class InvokerServerHttpHandler extends SimpleChannelInboundHandler<FullHttpRequest> {

        /**
         * The values uri prefix.
         */
        public static final String VALUE_PREFIX = "value";

        /**
         * The method uri prefix.
         */
        public static final String METHOD_PREFIX = "do";

        /**
         * The get uri prefix.
         */
        public static final String GET_PREFIX = "get";

        /**
         * The save uri prefix.
         */
        public static final String SAVE_PREFIX = "save";

        /**
         * The run uri prefix.
         */
        public static final String RUN_PREFIX = "run";

        /**
         * The main uri prefix.
         */
        public static final String MAIN_PREFIX = "main";

        /**
         * The local main uri prefix.
         */
        public static final String LOCAL_MAIN_PREFIX = "_main";

        /**
         * The static resource prefix.
         */
        public static final String STATIC_PREFIX = "static";

        /**
         * The default buffer.
         */
        public final InvokerInfoBuffer defaultBuffer = new InvokerInfoBuffer();

        /**
         * The main html buffer.
         */
        public final InvokerInfoBuffer mainHtmlBuffer = new InvokerInfoBuffer();

        /**
         * The local main html buffer.
         */
        public final InvokerInfoBuffer localMainHtmlBuffer = new InvokerInfoBuffer();

        /**
         * Process the given URI and return the info buffer for its response.
         *
         * @param request
         *            the http request
         * @return the response buffer
         * @throws IOException
         *             if decoding fails
         */
        public InvokerInfoBuffer processRequest(final FullHttpRequest request) throws IOException {
            return processRequest(request.getUri());
        }

        /**
         * Process the given URI and return the info buffer for its response.
         *
         * @param requestUri
         *            the http request uri
         * @return the response buffer
         * @throws IOException
         *             if decoding fails
         */
        public InvokerInfoBuffer processRequest(final String requestUri) throws IOException {
            if (!requestUri.startsWith(contextPrefix)) {
                return defaultBuffer;
            }
            final String uri = requestUri.substring(contextPrefix.length() + 1);
            // match uri
            boolean status = false;
            if (!uriWhitePatterns.isEmpty()) {
                status = uriWhitePatterns.stream().anyMatch(p -> p.matcher(uri).matches());
            } else {
                status = true;
            }
            if (status && !uriBlackPatterns.isEmpty()) {
                status &= uriBlackPatterns.stream().allMatch(p -> !p.matcher(uri).matches());
            }
            if (!status) {
                return defaultBuffer;
            }
            final String[] uriSpec = uri.split(SLASH, 3);
            InvokerInfoBuffer responseBuffer = null;
            if (uriSpec[0].equalsIgnoreCase(InvokerServerHttpHandler.VALUE_PREFIX)) {
                responseBuffer = new InvokerInfoBuffer();
                invoker.appendValue(responseBuffer, uriSpec[1], URLDecoder.decode(uriSpec[2], "UTF-8"), true);
            } else if (uriSpec[0].equalsIgnoreCase(InvokerServerHttpHandler.METHOD_PREFIX)) {
                responseBuffer = new InvokerInfoBuffer();
                invoker.appendValue(responseBuffer, uriSpec[1], URLDecoder.decode(uriSpec[2], "UTF-8"), false);
            } else if (uriSpec[0].equalsIgnoreCase(InvokerServerHttpHandler.GET_PREFIX)
                    || uriSpec[0].equalsIgnoreCase(InvokerServerHttpHandler.SAVE_PREFIX)) {
                responseBuffer = new InvokerInfoBuffer();
                try {
                    final Object result = invoker.invokeNestedMethod(uriSpec[1],
                            URLDecoder.decode(uriSpec[2], "UTF-8"));
                    if (result instanceof byte[]) {
                        responseBuffer.append((byte[]) result);
                    } else {
                        responseBuffer.append(gson.toJson(result));
                    }
                } catch (final Throwable th) {
                    invoker.appendError(responseBuffer, th);
                }
            } else if (uriSpec[0].equalsIgnoreCase(InvokerServerHttpHandler.RUN_PREFIX)) {
                responseBuffer = new InvokerInfoBuffer();
                invoker.appendRunValue(responseBuffer, URLDecoder.decode(uriSpec[1], "UTF-8"));
            } else if (uriSpec[0].startsWith(InvokerServerHttpHandler.MAIN_PREFIX)) {
                responseBuffer = mainHtmlBuffer.clone();
            } else if (uriSpec[0].startsWith(InvokerServerHttpHandler.LOCAL_MAIN_PREFIX)) {
                responseBuffer = localMainHtmlBuffer.clone();
            } else if (uriSpec[0].equalsIgnoreCase(InvokerServerHttpHandler.STATIC_PREFIX)) {
                responseBuffer = new InvokerInfoBuffer(InvokerInfoBuffer.DOUBLE_MAX_CAPACITY);
                responseBuffer.byteBuf.writeBytes(MetaUtil
                        .getResourceAsBytes(URLDecoder.decode(requestUri.substring(contextPrefix.length()), "UTF-8")));
            } else {
                return defaultBuffer;
            }
            return responseBuffer;
        }

        /*
         * (non-Javadoc)
         *
         * @see io.netty.channel.ChannelHandlerAdapter#exceptionCaught(io.netty. channel
         * .ChannelHandlerContext, java.lang.Throwable)
         */
        @Override
        public void exceptionCaught(final ChannelHandlerContext ctx, final Throwable cause) throws Exception {
            // super.exceptionCaught(ctx, cause);
            ctx.disconnect();
        }

        /*
         * (non-Javadoc)
         *
         * @see io.netty.channel.SimpleChannelInboundHandler#channelRead0(io.netty. channel
         * .ChannelHandlerContext, java.lang.Object)
         */
        @Override
        public void channelRead0(final ChannelHandlerContext ctx, final FullHttpRequest request) throws Exception {
            // URLDecoder.decode(request.getUri(), CharsetUtil.UTF_8.name());
            ByteBuf buf = defaultBuffer.byteBuf;
            if (request.getMethod().compareTo(HttpMethod.OPTIONS) != 0) {
                buf = processRequest(request).byteBuf;
            }
            final FullHttpResponse response = new DefaultFullHttpResponse(HttpVersion.HTTP_1_1,
                    buf == defaultBuffer.byteBuf ? HttpResponseStatus.NOT_FOUND : HttpResponseStatus.OK, buf, false);
            response.headers().add("Access-Control-Allow-Origin", "*");
            response.headers().add("Access-Control-Allow-Headers", "Content-Type");
            if (request.getUri().startsWith(contextPrefix + SLASH + SAVE_PREFIX)) {
                response.headers().add("Content-Type", "application/octet-stream");
                response.headers().add("Content-Disposition", "attachment; filename=\"invoker.out\"");
            }
            ctx.writeAndFlush(response).addListener(ChannelFutureListener.CLOSE);
            // buffer.close();
        }

    }

    /**
     * Invoker server HTTP initializer.
     *
     * @author Dinesh Ilindra
     */
    public class InvokerServerHttpInitializer extends ChannelInitializer<SocketChannel> {

        private final InvokerServerHttpHandler handler = new InvokerServerHttpHandler();

        /**
         * @return the handler
         */
        public InvokerServerHttpHandler getHandler() {
            return handler;
        }

        /**
         * @param obj
         *            the argument
         * @return the value
         */
        public Object run(final Object obj) {
            if (obj instanceof Map) {
                return ((Map<?, ?>) obj).values();
            } else {
                return obj;
            }
        }

        /*
         * (non-Javadoc)
         *
         * @see io.netty.channel.ChannelInitializer#initChannel(io.netty.channel. Channel )
         */
        @Override
        public void initChannel(final SocketChannel channel) throws Exception {
            final ChannelPipeline pipeline = channel.pipeline();
            pipeline.addLast("encoder", new HttpResponseEncoder());
            pipeline.addLast("decoder", new HttpRequestDecoder());
            pipeline.addLast("aggregator", new HttpObjectAggregator(2 * Short.MAX_VALUE));
            pipeline.addLast("handler", handler);
        }

    }

    public static final String SLASH = "/";

    private static final Object[] EMPTY_OBJECT_ARRAY = new Object[] {};

    private static Instrumentation instr;

    public static Instrumentation getInstr() {
        return instr;
    }

    public static void loadAgent(final String agentName) throws Exception {
        AgentLoader.loadAgentClass(agentName, "");
    }

    public static Instrumentation initInstr(final Instrumentation defaultInstr) {
        if (instr == null) {
            try {
                loadAgent(InstrumentationAgent.class.getName());
                instr = InstrumentationAgent.getInstrumentation();
            } catch (final Throwable th) {
                instr = defaultInstr;
            }
        }
        return instr;
    }

    static {
        initInstr(null);
    }

    /**
     * @param className
     *            the class name
     * @param defUri
     *            the defUri
     * @throws Exception
     *             if problem
     */
    public static void reloadClass(final String className, final String defUri) throws Exception {
        final Class<?> clazz = Class.forName(className);
        instr.redefineClasses(new ClassDefinition(clazz, IOUtils.toByteArray(new URI(defUri))));
    }

    /**
     * @param className
     *            the class name
     * @throws Exception
     *             if problem
     */
    public static void reloadClass(final String className) throws Exception {
        final Class<?> clazz = Class.forName(className);
        instr.redefineClasses(new ClassDefinition(clazz, MetaUtil.fetchClassDefinitionBytes(clazz, clazz)));
    }

    /**
     * @param fqcn
     *            the class name
     * @param methodName
     *            the method name
     * @param argLength
     *            the arg length
     * @param mode
     *            the mode
     * @param logic
     *            the logic
     * @throws Exception
     *             if problem
     */
    public static void addLogic(final String fqcn, final String methodName, final String argLength, final String mode,
            final String logic) throws Exception {
        MetaUtil.addLogic(instr, fqcn, methodName, argLength, mode, logic);
    }

    /**
     * @param className
     *            the class name
     * @return the bytes
     * @throws Exception
     *             if problem
     */
    public static byte[] fetchClass(final String className) throws Exception {
        final Class<?> clazz = Class.forName(className);
        return MetaUtil.fetchClassDefinitionBytes(clazz, clazz);
    }

    /**
     * @param packageName
     *            the package
     * @return the jar bytes
     * @throws Exception
     *             if problem
     */
    public static synchronized byte[] fetchPackage(final String packageName) throws Exception {
        final List<Class<?>> classes = MetaUtil.getClasses(packageName);
        if (classes.isEmpty()) {
            return new byte[0];
        } else {
            FileUtils.deleteDirectory(new File(System.getProperty("java.io.tmpdir") + "/tmp/java/classes"));
            return IOUtils.toByteArray(new FileInputStream(MetaUtil.createJarFromClasses(classes.get(0),
                    System.getProperty("java.io.tmpdir") + "/tmp/java/classes", packageName + "_classes", null,
                    classes)));
        }
    }

    /**
     * @param className
     *            the class name
     * @param runnerUri
     *            the runnerUri
     * @throws Exception
     *             if problem
     */
    public void extraRun(final String className, final String runnerUri) throws Exception {
        try {
            final byte[] classBytes = IOUtils.toByteArray(new URI(runnerUri));
            ClassLoader.class.getMethod("defineClass", String.class, byte[].class, int.class, int.class).invoke(
                    Thread.currentThread().getContextClassLoader(), className, classBytes, 0, classBytes.length);
        } catch (final Exception ex) {
            // nothing
        }
        Class.forName(className).getMethod("run", InvokerService.class).invoke(null, this);
    }

    private final Gson gson = new Gson();

    private final NettyServerRef<InvokerServerHttpInitializer> nettyServerRef = new NettyServerRef<InvokerService.InvokerServerHttpInitializer>(
            new ServerBootstrap(), new InvokerServerHttpInitializer(), new NioEventLoopGroup(), new NioEventLoopGroup(),
            NioServerSocketChannel.class);

    private final URIInvoker invoker;

    private int port;

    private String contextPrefix = "";

    private SimpleWebServer nanoServer;

    private String mainJsName = "invoker";

    private List<String> uriWhitelist;

    private List<String> uriBlacklist;

    private List<Pattern> uriWhitePatterns;

    private List<Pattern> uriBlackPatterns;

    private String extjsResourcePrefix = "https://cdn.jsdelivr.net/gh/dineshbjn/jin@master/src/main/resources/static/extjs";

    private String miscjsResourcePrefix = "https://cdn.jsdelivr.net/gh/dineshbjn/jin@master/src/main/resources/static/misc";

    private String invokerjsResourcePrefix = "https://raw.githack.com/dineshbjn/jin/master/src/main/resources/static/jin";

    private volatile boolean running;

    /**
     * the default one
     */
    public InvokerService() {
        this(5678, InvokerService.EMPTY_OBJECT_ARRAY);
    }

    /**
     * @param port
     *            the port to use
     * @param targets
     *            the targets
     */
    public InvokerService(final int port, final Object... targets) {
        this.port = port;
        invoker = new URIInvoker(targets);
        invoker.setTarget("service", this);
    }

    /**
     * @param targetMap
     *            the target map
     * @param port
     *            the port to use
     */
    public InvokerService(final int port, final Map<String, Object> targetMap) {
        this.port = port;
        invoker = new URIInvoker(targetMap);
        invoker.setTarget("service", this);
    }

    /**
     * Process the given request and URI spec.
     *
     * @param request
     *            the http request
     * @param uriSpec
     *            the URI specification
     * @return the response buffer
     */
    public InvokerInfoBuffer processRequest(final FullHttpRequest request, final String[] uriSpec) {
        return nettyServerRef.getChannelInitializer().getHandler().defaultBuffer;
    }

    /**
     * Start
     */
    public void start() {
        start("");
    }

    /**
     * Start with context.
     *
     * @param contextPrefix
     *            the context prefix
     */
    public void start(final String contextPrefix) {
        if (running) {
            return;
        }
        if (contextPrefix.trim().isEmpty() || contextPrefix.startsWith("/")) {
            this.contextPrefix = contextPrefix.trim();
        } else {
            this.contextPrefix = SLASH + contextPrefix.trim();
        }
        if (uriWhitelist != null) {
            uriWhitePatterns = uriWhitelist.stream().map(p -> Pattern.compile(p)).collect(Collectors.toList());
        } else {
            uriWhitePatterns = new ArrayList<>();
        }
        if (uriBlacklist != null) {
            uriBlackPatterns = uriBlacklist.stream().map(p -> Pattern.compile(p)).collect(Collectors.toList());
        } else {
            uriBlackPatterns = new ArrayList<>();
        }
        // Initialize Netty.
        ChannelFuture future = null;
        nettyServerRef.initServerBootstrap();
        int currentPort = port;
        try {
            currentPort = MetaUtil.availablePort(port, 100);
            nettyServerRef.initWithPort(currentPort);
            future = nettyServerRef.getServerBootstrap().bind().syncUninterruptibly();
        } catch (final Exception ex) {
            currentPort = MetaUtil.availablePort(port, 100);
            nettyServerRef.initWithPort(currentPort);
            future = nettyServerRef.getServerBootstrap().bind().syncUninterruptibly();
        }
        nettyServerRef.getChannelInitializer().getHandler().mainHtmlBuffer.appendString(MetaUtil
                .getResourceAsString("/jin.html").replaceAll("<mainJsName>", mainJsName)
                .replaceAll("<extjsPrefix>", extjsResourcePrefix).replaceAll("<miscjsPrefix>", miscjsResourcePrefix)
                .replaceAll("<invokerjsPrefix>", invokerjsResourcePrefix));
        nettyServerRef.getChannelInitializer().getHandler().localMainHtmlBuffer
                .appendString(MetaUtil.getResourceAsString("/jin.html").replaceAll("<mainJsName>", mainJsName)
                        .replaceAll("<extjsPrefix>", "static/extjs").replaceAll("<miscjsPrefix>", "static/misc")
                        .replaceAll("<invokerjsPrefix>", "static/jin"));
        final ChannelFuture serverFuture = future;
        new Thread((Runnable) () -> serverFuture.channel().closeFuture().syncUninterruptibly(),
                InvokerService.class.getSimpleName());
        nanoServer = new SimpleWebServer("0.0.0.0", MetaUtil.availablePort(10000 + currentPort, 100), new File(SLASH),
                true, "*");
        // nanoServer.start();
        running = true;
    }

    /**
     * Stop.
     */
    public void stop() {
        running = false;
        // Destroy Netty.
        nettyServerRef.shutdown();
        nanoServer.stop();
    }

    /**
     * @return the port
     */
    public int getPort() {
        return port;
    }

    /**
     * @param port
     *            the port to set
     */
    public void setPort(final int port) {
        if (!running) {
            this.port = port;
        }
    }

    /**
     * @return the contextPrefix
     */
    public String getContextPrefix() {
        return contextPrefix;
    }

    /**
     * @param contextPrefix
     *            the contextPrefix to set
     */
    public void setContextPrefix(final String contextPrefix) {
        if (!running) {
            this.contextPrefix = contextPrefix;
        }
    }

    /**
     * @return the gson
     */
    public Gson getGson() {
        return gson;
    }

    /**
     * @return the nettyServerRef
     */
    public NettyServerRef<InvokerServerHttpInitializer> getNettyServerRef() {
        return nettyServerRef;
    }

    /**
     * @return the invoker
     */
    public URIInvoker getInvoker() {
        return invoker;
    }

    /**
     * @return the nanoServer
     */
    public SimpleWebServer getNanoServer() {
        return nanoServer;
    }

    /**
     * @return the running
     */
    public boolean isRunning() {
        return running;
    }

    /**
     * @return the uriWhitelist
     */
    public List<String> getUriWhitelist() {
        return uriWhitelist;
    }

    /**
     * @param uriWhitelist
     *            the uriWhitelist to set
     */
    public void setUriWhitelist(final List<String> uriWhitelist) {
        this.uriWhitelist = uriWhitelist;
    }

    /**
     * @return the uriBlacklist
     */
    public List<String> getUriBlacklist() {
        return uriBlacklist;
    }

    /**
     * @param uriBlacklist
     *            the uriBlacklist to set
     */
    public void setUriBlacklist(final List<String> uriBlacklist) {
        this.uriBlacklist = uriBlacklist;
    }

    /**
     * @return the extjsResourcePrefix
     */
    public String getExtjsResourcePrefix() {
        return extjsResourcePrefix;
    }

    /**
     * @param extjsResourcePrefix
     *            the extjsResourcePrefix to set
     */
    public void setExtjsResourcePrefix(final String extjsResourcePrefix) {
        this.extjsResourcePrefix = extjsResourcePrefix;
    }

    /**
     * @return the invokerjsResourcePrefix
     */
    public String getInvokerjsResourcePrefix() {
        return invokerjsResourcePrefix;
    }

    /**
     * @param invokerjsResourcePrefix
     *            the invokerjsResourcePrefix to set
     */
    public void setInvokerjsResourcePrefix(final String invokerjsResourcePrefix) {
        this.invokerjsResourcePrefix = invokerjsResourcePrefix;
    }

    /**
     * @return the miscjsResourcePrefix
     */
    public String getMiscjsResourcePrefix() {
        return miscjsResourcePrefix;
    }

    /**
     * @param miscjsResourcePrefix
     *            the miscjsResourcePrefix to set
     */
    public void setMiscjsResourcePrefix(final String miscjsResourcePrefix) {
        this.miscjsResourcePrefix = miscjsResourcePrefix;
    }

    /**
     * @return the mainJsName
     */
    public String getMainJsName() {
        return mainJsName;
    }

    /**
     * @param mainJsName
     *            the mainJsName to set
     */
    public void setMainJsName(final String mainJsName) {
        this.mainJsName = mainJsName;
    }

    /**
     * The singleton instance.
     */
    private static InvokerService service;

    /**
     * Returns the singleton instance.
     *
     * @return the singleton instance
     */
    public static InvokerService getInstance() {
        if (service == null) {
            synchronized (InvokerService.class) {
                if (service == null) {
                    service = new InvokerService();
                }
            }
        }
        return InvokerService.service;
    }

    /**
     * Start the singleton instance with given targets.
     *
     * @param targets
     *            the targets
     */
    public static void start(final Object... targets) {
        InvokerService.getInstance().invoker.addTargets(targets);
        InvokerService.getInstance().start();
    }

    /**
     * The starter for command line.
     *
     * @param args
     *            the arguments
     */
    public static void main(final String[] args) {
        int port = 5678;
        String context = "";
        if (args.length > 0) {
            port = Integer.parseInt(args[0]);
        }
        if (args.length > 1) {
            context = args[1];
        }
        InvokerService.getInstance().setPort(port);
        InvokerService.getInstance().start(context);
        if (args.length > 2 && args[2].equals("py4j")) {
            if(args.length > 3) {
                int count = Integer.parseInt(args[3]);
                for (int i=0; i < count; i++) {
                    new GatewayServer(InvokerService.getInstance(), 7000 + i, 7100 + i, 
                        GatewayServer.DEFAULT_CONNECT_TIMEOUT, GatewayServer.DEFAULT_READ_TIMEOUT, null).start();
                }
            } else {
                new GatewayServer(InvokerService.getInstance()).start();
            }
        }
    }

}
